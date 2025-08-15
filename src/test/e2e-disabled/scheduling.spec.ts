import { test, expect } from '@playwright/test'

test.describe('Scheduling Integration & Performance', () => {
  test.beforeEach(async ({ page }) => {
    // SETUP: Login as teacher and navigate to studio
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'teacher@test.com')
    await page.fill('[data-testid="password-input"]', 'securePassword123')
    await page.click('[data-testid="login-submit"]')
    await page.click('text=Test Music Studio')
  })

  test('complete scheduling flow from setup to results', async ({ page }) => {
    // STEP 1: Set teacher availability
    await page.click('text=Set Availability')
    
    // Set comprehensive availability (Mon-Fri 9am-5pm)
    for (let day = 0; day < 5; day++) {
      const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      for (let slot = 0; slot < 16; slot++) { // 9am-5pm = 16 slots
        await page.click(`[data-testid="${dayNames[day]}-slot-${slot}"]`)
      }
    }
    
    await page.click('[data-testid="save-availability"]')
    await expect(page.locator('text=Availability saved')).toBeVisible()
    
    // STEP 2: Verify students are enrolled (this would be pre-test setup)
    const studentCount = await page.locator('[data-testid="student-count"]').textContent()
    expect(parseInt(studentCount ?? '0')).toBeGreaterThan(0)
    
    // STEP 3: Open solver dialog
    await page.click('text=Generate Schedule')
    await expect(page.locator('[data-testid="solve-dialog"]')).toBeVisible()
    
    // STEP 4: Configure solver heuristics
    await page.selectOption('[data-testid="consecutive-hours"]', '4') // 2 hours max consecutive
    await page.selectOption('[data-testid="break-length"]', '1') // 30min break
    
    // STEP 5: Record start time and run solver
    const startTime = Date.now()
    await page.click('[data-testid="solve-schedule"]')
    
    // STEP 6: Wait for solver completion
    await expect(page.locator('text=Schedule generated')).toBeVisible({ timeout: 30000 })
    const endTime = Date.now()
    const solverTime = endTime - startTime
    
    // STEP 7: Verify performance (should complete in reasonable time)
    expect(solverTime).toBeLessThan(10000) // Less than 10 seconds
    console.log(`Solver completed in ${solverTime}ms`)
    
    // STEP 8: Verify schedule results are displayed
    const scheduleResults = page.locator('[data-testid="schedule-results"]')
    await expect(scheduleResults).toBeVisible()
    
    // STEP 9: Verify assignments in calendar view
    const assignments = page.locator('[data-testid^="assignment-"]')
    const assignmentCount = await assignments.count()
    expect(assignmentCount).toBeGreaterThan(0)
    
    // STEP 10: Verify no scheduling conflicts
    // Check that no two assignments overlap in time
    const assignmentTimes = []
    for (let i = 0; i < assignmentCount; i++) {
      const assignment = assignments.nth(i)
      const timeData = await assignment.getAttribute('data-time')
      assignmentTimes.push(timeData)
    }
    
    // Verify all times are unique (no overlaps)
    const uniqueTimes = new Set(assignmentTimes)
    expect(uniqueTimes.size).toBe(assignmentTimes.length)
    
    // STEP 11: Verify lesson length constraints are respected
    const thirtyMinLessons = page.locator('[data-testid^="assignment-"][data-duration="30"]')
    const sixtyMinLessons = page.locator('[data-testid^="assignment-"][data-duration="60"]')
    
    const thirtyCount = await thirtyMinLessons.count()
    const sixtyCount = await sixtyMinLessons.count()
    
    console.log(`30min lessons: ${thirtyCount}, 60min lessons: ${sixtyCount}`)
    expect(thirtyCount + sixtyCount).toBe(assignmentCount)
  })

  test('handles edge case: no solution exists', async ({ page }) => {
    // STEP 1: Create impossible scenario - clear all teacher availability
    await page.click('text=Set Availability')
    await page.click('[data-testid="clear-all"]')
    await page.click('[data-testid="save-availability"]')
    
    // STEP 2: Try to generate schedule
    await page.click('text=Generate Schedule')
    await page.click('[data-testid="solve-schedule"]')
    
    // STEP 3: Verify error handling
    await expect(page.locator('text=Unable to schedule all students')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="unsolvable-message"]')).toBeVisible()
    
    // STEP 4: Verify suggested solutions are provided
    await expect(page.locator('text=Add more availability')).toBeVisible()
    await expect(page.locator('[data-testid="suggestions-list"]')).toBeVisible()
    
    // STEP 5: Verify which students couldn't be scheduled
    const unscheduledStudents = page.locator('[data-testid="unscheduled-student"]')
    const unscheduledCount = await unscheduledStudents.count()
    expect(unscheduledCount).toBeGreaterThan(0)
  })

  test('handles mixed lesson lengths correctly', async ({ page }) => {
    // STEP 1: Ensure we have both 30min and 60min students enrolled
    // This would be verified through the student list or created as test data
    
    // STEP 2: Set teacher availability
    await page.click('text=Set Availability')
    
    // Set Monday and Tuesday full day availability
    for (let day = 0; day < 2; day++) {
      const dayNames = ['monday', 'tuesday']
      for (let slot = 0; slot < 16; slot++) {
        await page.click(`[data-testid="${dayNames[day]}-slot-${slot}"]`)
      }
    }
    
    await page.click('[data-testid="save-availability"]')
    
    // STEP 3: Generate schedule
    await page.click('text=Generate Schedule')
    await page.selectOption('[data-testid="consecutive-hours"]', '6') // Allow longer sessions
    await page.click('[data-testid="solve-schedule"]')
    
    // STEP 4: Wait for completion
    await expect(page.locator('text=Schedule generated')).toBeVisible({ timeout: 20000 })
    
    // STEP 5: Verify different lesson lengths are handled correctly
    const thirtyMinSlots = page.locator('[data-testid^="assignment-"][data-duration="30"]')
    const sixtyMinSlots = page.locator('[data-testid^="assignment-"][data-duration="60"]')
    
    const thirtyCount = await thirtyMinSlots.count()
    const sixtyCount = await sixtyMinSlots.count()
    
    console.log(`Mixed lesson results: ${thirtyCount} x 30min, ${sixtyCount} x 60min`)
    
    // STEP 6: Verify 60min lessons span exactly 2 time slots
    if (sixtyCount > 0) {
      const firstSixtyMin = sixtyMinSlots.first()
      // const timeSlot = await firstSixtyMin.getAttribute('data-time') // Unused variable
      
      // A 60min lesson should have a visual indicator spanning 2 slots
      await expect(firstSixtyMin).toHaveClass(/lesson-60|double-slot/)
    }
    
    // STEP 7: Verify 30min lessons span exactly 1 time slot
    if (thirtyCount > 0) {
      const firstThirtyMin = thirtyMinSlots.first()
      await expect(firstThirtyMin).toHaveClass(/lesson-30|single-slot/)
    }
  })

  test('respects teacher consecutive lesson limits', async ({ page }) => {
    // STEP 1: Set limited availability to force consecutive lessons
    await page.click('text=Set Availability')
    
    // Set only Monday 9am-2pm (10 slots) for multiple students
    for (let slot = 0; slot < 10; slot++) {
      await page.click(`[data-testid="monday-slot-${slot}"]`)
    }
    
    await page.click('[data-testid="save-availability"]')
    
    // STEP 2: Generate schedule with strict consecutive limits
    await page.click('text=Generate Schedule')
    await page.selectOption('[data-testid="consecutive-hours"]', '2') // Max 2 hours consecutive
    await page.selectOption('[data-testid="break-length"]', '1') // 30min break required
    await page.click('[data-testid="solve-schedule"]')
    
    // STEP 3: Wait for completion
    await expect(page.locator('text=Schedule generated')).toBeVisible({ timeout: 15000 })
    
    // STEP 4: Verify consecutive lesson limits are respected
    const mondayAssignments = page.locator('[data-testid^="assignment-"][data-day="monday"]')
    const assignmentCount = await mondayAssignments.count()
    
    if (assignmentCount >= 5) { // If we have enough assignments to test breaks
      // Get all assignment times and sort them
      const assignmentTimes = []
      for (let i = 0; i < assignmentCount; i++) {
        const assignment = mondayAssignments.nth(i)
        const timeSlot = await assignment.getAttribute('data-slot')
        assignmentTimes.push(parseInt(timeSlot ?? '0'))
      }
      
      assignmentTimes.sort((a, b) => a - b)
      
      // Check for required breaks after 4 consecutive slots (2 hours)
      let consecutiveCount = 1
      for (let i = 1; i < assignmentTimes.length; i++) {
        if (assignmentTimes[i] === assignmentTimes[i-1] + 1) {
          consecutiveCount++
          
          // After 4 consecutive slots, there should be a break
          if (consecutiveCount > 4) {
            const hasBreak = i + 1 < assignmentTimes.length && 
                            assignmentTimes[i+1] > assignmentTimes[i] + 1
            expect(hasBreak).toBe(true)
            consecutiveCount = 1 // Reset count after break
          }
        } else {
          consecutiveCount = 1 // Reset count on gap
        }
      }
    }
  })

  test('performance benchmark: 20+ students in under 10 seconds', async ({ page }) => {
    // STEP 1: Verify we have enough students for performance test
    const studentCount = await page.locator('[data-testid="student-count"]').textContent()
    const numStudents = parseInt(studentCount ?? '0')
    
    if (numStudents < 20) {
      test.skip('Insufficient students for performance test (need 20+)')
    }
    
    // STEP 2: Set comprehensive teacher availability
    await page.click('text=Set Availability')
    
    // Set full week availability (Mon-Fri 9am-6pm)
    for (let day = 0; day < 5; day++) {
      const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      for (let slot = 0; slot < 18; slot++) { // 9am-6pm = 18 slots
        await page.click(`[data-testid="${dayNames[day]}-slot-${slot}"]`)
      }
    }
    
    await page.click('[data-testid="save-availability"]')
    
    // STEP 3: Configure solver for performance
    await page.click('text=Generate Schedule')
    await page.selectOption('[data-testid="consecutive-hours"]', '6') // Allow flexibility
    await page.selectOption('[data-testid="break-length"]', '1')
    
    // STEP 4: Run performance test
    console.log(`Starting performance test with ${numStudents} students`)
    const startTime = Date.now()
    
    await page.click('[data-testid="solve-schedule"]')
    await expect(page.locator('text=Schedule generated')).toBeVisible({ timeout: 30000 })
    
    const endTime = Date.now()
    const solverTime = endTime - startTime
    
    // STEP 5: Verify performance target
    console.log(`Performance test: ${numStudents} students scheduled in ${solverTime}ms`)
    expect(solverTime).toBeLessThan(10000) // Must complete in under 10 seconds
    
    // STEP 6: Verify solution quality
    const assignments = page.locator('[data-testid^="assignment-"]')
    const assignmentCount = await assignments.count()
    
    // Should schedule at least 80% of students (some conflicts expected)
    const scheduleRate = assignmentCount / numStudents
    expect(scheduleRate).toBeGreaterThan(0.8)
    
    console.log(`Scheduled ${assignmentCount}/${numStudents} students (${Math.round(scheduleRate * 100)}%)`)
  })

  test('handles complex availability patterns', async ({ page }) => {
    // STEP 1: Set irregular teacher availability pattern
    await page.click('text=Set Availability')
    
    // Irregular pattern: Monday morning, Wednesday afternoon, Friday morning
    // Monday 9am-12pm
    for (let slot = 0; slot < 6; slot++) {
      await page.click(`[data-testid="monday-slot-${slot}"]`)
    }
    
    // Wednesday 2pm-5pm
    for (let slot = 10; slot < 16; slot++) {
      await page.click(`[data-testid="wednesday-slot-${slot}"]`)
    }
    
    // Friday 10am-1pm
    for (let slot = 2; slot < 8; slot++) {
      await page.click(`[data-testid="friday-slot-${slot}"]`)
    }
    
    await page.click('[data-testid="save-availability"]')
    
    // STEP 2: Generate schedule with complex pattern
    await page.click('text=Generate Schedule')
    await page.click('[data-testid="solve-schedule"]')
    
    // STEP 3: Verify solver handles complex patterns
    await Promise.race([
      page.locator('text=Schedule generated').waitFor({ timeout: 20000 }),
      page.locator('text=Unable to schedule all students').waitFor({ timeout: 20000 })
    ])
    
    // STEP 4: Verify appropriate outcome
    const isSuccess = await page.locator('text=Schedule generated').isVisible()
    const isPartialFailure = await page.locator('text=Unable to schedule all students').isVisible()
    
    expect(isSuccess || isPartialFailure).toBe(true) // Should get some result
    
    if (isSuccess) {
      // STEP 5: Verify assignments respect availability pattern
      const mondayAssignments = page.locator('[data-testid^="assignment-"][data-day="monday"]')
      const wednesdayAssignments = page.locator('[data-testid^="assignment-"][data-day="wednesday"]')
      const fridayAssignments = page.locator('[data-testid^="assignment-"][data-day="friday"]')
      
      const mondayCount = await mondayAssignments.count()
      const wednesdayCount = await wednesdayAssignments.count()
      const fridayCount = await fridayAssignments.count()
      
      console.log(`Complex pattern results: Mon:${mondayCount}, Wed:${wednesdayCount}, Fri:${fridayCount}`)
      
      // Should have assignments spread across available days
      expect(mondayCount + wednesdayCount + fridayCount).toBeGreaterThan(0)
    }
  })

  test('solver stability: multiple runs produce consistent results', async ({ page }) => {
    // STEP 1: Set stable availability
    await page.click('text=Set Availability')
    
    // Set consistent Monday-Wednesday availability
    for (let day = 0; day < 3; day++) {
      const dayNames = ['monday', 'tuesday', 'wednesday']
      for (let slot = 0; slot < 12; slot++) { // 9am-3pm
        await page.click(`[data-testid="${dayNames[day]}-slot-${slot}"]`)
      }
    }
    
    await page.click('[data-testid="save-availability"]')
    
    // STEP 2: Run solver multiple times
    const results = []
    
    for (let run = 0; run < 3; run++) {
      await page.click('text=Generate Schedule')
      await page.selectOption('[data-testid="consecutive-hours"]', '3')
      
      const startTime = Date.now()
      await page.click('[data-testid="solve-schedule"]')
      await expect(page.locator('text=Schedule generated')).toBeVisible({ timeout: 15000 })
      const endTime = Date.now()
      
      // Collect results
      const assignments = page.locator('[data-testid^="assignment-"]')
      const assignmentCount = await assignments.count()
      
      results.push({
        run: run + 1,
        time: endTime - startTime,
        assignments: assignmentCount
      })
      
      console.log(`Run ${run + 1}: ${assignmentCount} assignments in ${endTime - startTime}ms`)
      
      // Clear for next run
      await page.click('[data-testid="clear-schedule"]')
    }
    
    // STEP 3: Verify consistency
    const assignmentCounts = results.map(r => r.assignments)
    const uniqueCounts = new Set(assignmentCounts)
    
    // All runs should produce the same number of assignments (deterministic solver)
    expect(uniqueCounts.size).toBe(1)
    
    // All runs should complete in reasonable time
    const maxTime = Math.max(...results.map(r => r.time))
    expect(maxTime).toBeLessThan(15000)
    
    console.log('Solver stability test passed: consistent results across multiple runs')
  })
})