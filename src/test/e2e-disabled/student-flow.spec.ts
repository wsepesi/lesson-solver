import { test, expect } from '@playwright/test'

test.describe('Student Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // STEP 1: Start from homepage before each test
    await page.goto('/')
  })

  test('student enrollment with studio code', async ({ page }) => {
    // STEP 1: Navigate to enrollment page
    await page.click('text=Join Studio') // Adjust selector based on actual button text
    
    // STEP 2: Enter studio code
    const studioCode = 'ABC12' // This would be a known test studio code
    await page.fill('[data-testid="studio-code-input"]', studioCode)
    await page.click('[data-testid="find-studio"]')
    
    // STEP 3: Verify studio found and details displayed
    await expect(page.locator('[data-testid="studio-details"]')).toBeVisible()
    await expect(page.locator('text=Test Music Studio')).toBeVisible()
    
    // STEP 4: Fill student enrollment form
    await page.fill('[data-testid="student-name"]', 'Alice Smith')
    await page.fill('[data-testid="student-email"]', 'alice@test.com')
    await page.selectOption('[data-testid="lesson-length"]', '30') // 30 minute lesson
    
    // STEP 5: Submit enrollment
    await page.click('[data-testid="enroll-submit"]')
    
    // STEP 6: Verify enrollment success
    await expect(page.locator('text=Enrollment successful')).toBeVisible()
    await expect(page.locator('text=Set your availability')).toBeVisible()
  })

  test('student sets availability schedule', async ({ page }) => {
    // SETUP: Navigate to enrollment page for existing student
    await page.goto('/enroll')
    await page.fill('[data-testid="studio-code-input"]', 'ABC12')
    await page.click('[data-testid="find-studio"]')
    await page.fill('[data-testid="student-name"]', 'Bob Johnson')
    await page.fill('[data-testid="student-email"]', 'bob@test.com')
    await page.selectOption('[data-testid="lesson-length"]', '60') // 60 minute lesson
    await page.click('[data-testid="enroll-submit"]')
    
    // STEP 1: Verify availability calendar is shown
    await expect(page.locator('[data-testid="availability-calendar"]')).toBeVisible()
    
    // STEP 2: Select available time slots
    // Select Monday 14:00-16:00 (good for 60min lesson)
    await page.click('[data-testid="monday-slot-10"]') // 14:00
    await page.click('[data-testid="monday-slot-11"]') // 14:30
    await page.click('[data-testid="monday-slot-12"]') // 15:00
    await page.click('[data-testid="monday-slot-13"]') // 15:30
    
    // Select Wednesday 10:00-12:00
    await page.click('[data-testid="wednesday-slot-2"]') // 10:00
    await page.click('[data-testid="wednesday-slot-3"]') // 10:30
    await page.click('[data-testid="wednesday-slot-4"]') // 11:00
    await page.click('[data-testid="wednesday-slot-5"]') // 11:30
    
    // STEP 3: Save availability
    await page.click('[data-testid="save-availability"]')
    
    // STEP 4: Verify availability saved
    await expect(page.locator('text=Availability saved successfully')).toBeVisible()
    
    // STEP 5: Verify selected slots are highlighted
    const selectedSlots = page.locator('[data-testid^="monday-slot-"].selected, [data-testid^="wednesday-slot-"].selected')
    await expect(selectedSlots).toHaveCount(8) // 4 Monday + 4 Wednesday slots
    
    // STEP 6: Verify completion message
    await expect(page.locator('text=You will be notified when your lesson is scheduled')).toBeVisible()
  })

  test('student views assigned schedule', async ({ page }) => {
    // SETUP: Navigate to student view with existing enrollment
    // This assumes the student has been assigned a lesson time
    await page.goto('/enroll')
    await page.fill('[data-testid="studio-code-input"]', 'ABC12')
    await page.click('[data-testid="find-studio"]')
    await page.fill('[data-testid="student-name"]', 'Carol White')
    await page.fill('[data-testid="student-email"]', 'carol@test.com')
    await page.selectOption('[data-testid="lesson-length"]', '30')
    await page.click('[data-testid="enroll-submit"]')
    
    // Set availability
    await page.click('[data-testid="monday-slot-4"]') // 11:00
    await page.click('[data-testid="monday-slot-5"]') // 11:30
    await page.click('[data-testid="save-availability"]')
    
    // Wait for potential schedule assignment (this would happen after teacher generates schedule)
    // In a real test, this might involve waiting for an email notification or checking back later
    
    // STEP 1: Navigate back to check assigned schedule
    await page.goto('/enroll')
    await page.fill('[data-testid="studio-code-input"]', 'ABC12')
    await page.click('[data-testid="find-studio"]')
    await page.fill('[data-testid="student-email"]', 'carol@test.com') // Check existing enrollment
    await page.click('[data-testid="check-schedule"]')
    
    // STEP 2: Verify schedule is displayed (if assigned)
    // This test might show either assigned schedule or "pending assignment" message
    const scheduleDisplay = page.locator('[data-testid="student-schedule"]')
    await expect(scheduleDisplay).toBeVisible()
    
    // STEP 3: Check for assignment details or pending status
    const assignmentInfo = page.locator('[data-testid="assignment-info"]')
    await expect(assignmentInfo).toBeVisible()
    
    // If assigned, verify lesson details
    const hasAssignment = await page.locator('text=Your lesson is scheduled').isVisible()
    if (hasAssignment) {
      await expect(page.locator('[data-testid="lesson-time"]')).toBeVisible()
      await expect(page.locator('[data-testid="lesson-duration"]')).toBeVisible()
      await expect(page.locator('text=30 minutes')).toBeVisible()
    } else {
      // If not assigned yet, verify pending message
      await expect(page.locator('text=Your lesson will be scheduled soon')).toBeVisible()
    }
  })

  test('student receives and confirms lesson assignment', async ({ page }) => {
    // SETUP: Student with existing enrollment
    await page.goto('/enroll')
    await page.fill('[data-testid="studio-code-input"]', 'ABC12')
    await page.click('[data-testid="find-studio"]')
    await page.fill('[data-testid="student-name"]', 'David Brown')
    await page.fill('[data-testid="student-email"]', 'david@test.com')
    await page.selectOption('[data-testid="lesson-length"]', '60')
    await page.click('[data-testid="enroll-submit"]')
    
    // Set availability
    await page.click('[data-testid="tuesday-slot-6"]') // 12:00
    await page.click('[data-testid="tuesday-slot-7"]') // 12:30
    await page.click('[data-testid="tuesday-slot-8"]') // 13:00
    await page.click('[data-testid="tuesday-slot-9"]') // 13:30
    await page.click('[data-testid="save-availability"]')
    
    // STEP 1: Simulate receiving lesson assignment notification
    // In real implementation, this might be an email link or notification
    await page.goto('/student-schedule?email=david@test.com&token=mock-token')
    
    // STEP 2: Verify lesson assignment details
    await expect(page.locator('[data-testid="lesson-assignment"]')).toBeVisible()
    await expect(page.locator('text=Your lesson has been scheduled')).toBeVisible()
    
    // STEP 3: Verify lesson details are correct
    await expect(page.locator('[data-testid="lesson-day"]')).toContainText('Tuesday')
    await expect(page.locator('[data-testid="lesson-time"]')).toContainText('12:')
    await expect(page.locator('[data-testid="lesson-duration"]')).toContainText('60 minutes')
    
    // STEP 4: Confirm lesson acceptance
    await page.click('[data-testid="confirm-lesson"]')
    
    // STEP 5: Verify confirmation
    await expect(page.locator('text=Lesson confirmed')).toBeVisible()
    await expect(page.locator('[data-testid="calendar-event"]')).toBeVisible()
    
    // STEP 6: Test lesson modification request (if supported)
    await page.click('[data-testid="request-change"]')
    await page.fill('[data-testid="change-reason"]', 'Schedule conflict with work')
    await page.click('[data-testid="submit-change-request"]')
    
    await expect(page.locator('text=Change request submitted')).toBeVisible()
  })

  test('handles enrollment errors and edge cases', async ({ page }) => {
    // STEP 1: Test invalid studio code
    await page.goto('/enroll')
    await page.fill('[data-testid="studio-code-input"]', 'INVALID')
    await page.click('[data-testid="find-studio"]')
    
    // Verify error message
    await expect(page.locator('text=Studio not found')).toBeVisible()
    await expect(page.locator('[data-testid="studio-details"]')).not.toBeVisible()
    
    // STEP 2: Test duplicate enrollment
    await page.fill('[data-testid="studio-code-input"]', 'ABC12')
    await page.click('[data-testid="find-studio"]')
    await page.fill('[data-testid="student-name"]', 'Alice Smith')
    await page.fill('[data-testid="student-email"]', 'alice@test.com') // Same email as first test
    await page.selectOption('[data-testid="lesson-length"]', '30')
    await page.click('[data-testid="enroll-submit"]')
    
    // Verify duplicate enrollment handling
    await expect(page.locator('text=You are already enrolled')).toBeVisible()
    
    // STEP 3: Test empty form submission
    await page.goto('/enroll')
    await page.fill('[data-testid="studio-code-input"]', 'ABC12')
    await page.click('[data-testid="find-studio"]')
    await page.click('[data-testid="enroll-submit"]') // Submit without filling form
    
    // Verify validation errors
    await expect(page.locator('text=Name is required')).toBeVisible()
    await expect(page.locator('text=Email is required')).toBeVisible()
    
    // STEP 4: Test invalid email format
    await page.fill('[data-testid="student-name"]', 'Test Student')
    await page.fill('[data-testid="student-email"]', 'invalid-email')
    await page.click('[data-testid="enroll-submit"]')
    
    await expect(page.locator('text=Invalid email format')).toBeVisible()
    
    // STEP 5: Test availability without any slots selected
    await page.fill('[data-testid="student-email"]', 'valid@test.com')
    await page.click('[data-testid="enroll-submit"]')
    await page.click('[data-testid="save-availability"]') // Try to save without selecting slots
    
    await expect(page.locator('text=Please select at least one time slot')).toBeVisible()
  })

  test('student updates availability after enrollment', async ({ page }) => {
    // SETUP: Existing enrolled student
    await page.goto('/enroll')
    await page.fill('[data-testid="studio-code-input"]', 'ABC12')
    await page.click('[data-testid="find-studio"]')
    await page.fill('[data-testid="student-name"]', 'Emma Wilson')
    await page.fill('[data-testid="student-email"]', 'emma@test.com')
    await page.selectOption('[data-testid="lesson-length"]', '30')
    await page.click('[data-testid="enroll-submit"]')
    
    // Initial availability
    await page.click('[data-testid="monday-slot-2"]')
    await page.click('[data-testid="monday-slot-3"]')
    await page.click('[data-testid="save-availability"]')
    
    // STEP 1: Return to update availability
    await page.goto('/enroll')
    await page.fill('[data-testid="studio-code-input"]', 'ABC12')
    await page.click('[data-testid="find-studio"]')
    await page.fill('[data-testid="student-email"]', 'emma@test.com')
    await page.click('[data-testid="check-schedule"]')
    
    // STEP 2: Click to update availability
    await page.click('[data-testid="update-availability"]')
    
    // STEP 3: Verify current availability is pre-filled
    const selectedSlots = page.locator('[data-testid^="monday-slot-"].selected')
    await expect(selectedSlots).toHaveCount(2)
    
    // STEP 4: Add more availability
    await page.click('[data-testid="wednesday-slot-6"]') // Add Wednesday slot
    await page.click('[data-testid="friday-slot-8"]') // Add Friday slot
    
    // STEP 5: Remove some existing availability
    await page.click('[data-testid="monday-slot-2"]') // Unselect this slot
    
    // STEP 6: Save updated availability
    await page.click('[data-testid="save-availability"]')
    
    // STEP 7: Verify update success
    await expect(page.locator('text=Availability updated successfully')).toBeVisible()
    
    // STEP 8: Verify new availability count
    const finalSelectedSlots = page.locator('[data-testid^="slot-"].selected')
    await expect(finalSelectedSlots).toHaveCount(3) // 1 Monday + 1 Wednesday + 1 Friday
  })
})