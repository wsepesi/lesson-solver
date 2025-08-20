import { test, expect } from '@playwright/test'

test.describe('Teacher Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // STEP 1: Start from homepage before each test
    await page.goto('/')
  })

  test('complete teacher signup and studio creation flow', async ({ page }) => {
    // STEP 1: Navigate to signup
    await page.click('text=Sign Up') // Adjust selector based on actual button text
    
    // STEP 2: Fill signup form
    await page.fill('[data-testid="email-input"]', 'teacher@test.com')
    await page.fill('[data-testid="password-input"]', 'securePassword123')
    await page.fill('[data-testid="confirm-password-input"]', 'securePassword123')
    await page.click('[data-testid="signup-submit"]')
    
    // STEP 3: Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/studios/)
    
    // STEP 4: Create new studio
    await page.click('text=Create New Studio')
    
    // STEP 5: Fill studio form
    await page.fill('[data-testid="studio-name"]', 'Test Music Studio')
    await page.fill('[data-testid="studio-description"]', 'Piano and guitar lessons')
    await page.click('[data-testid="create-studio-submit"]')
    
    // STEP 6: Verify studio was created
    await expect(page.locator('text=Test Music Studio')).toBeVisible()
    
    // STEP 7: Verify studio code was generated
    const studioCode = page.locator('[data-testid="studio-code"]')
    await expect(studioCode).toBeVisible()
    await expect(studioCode).toHaveText(/[A-Z0-9]{5}/) // 5-character code format
  })

  test('teacher sets availability schedule', async ({ page }) => {
    // SETUP: Login as existing teacher with studio
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'teacher@test.com')
    await page.fill('[data-testid="password-input"]', 'securePassword123')
    await page.click('[data-testid="login-submit"]')
    
    // STEP 1: Navigate to existing studio
    await page.click('text=Test Music Studio') // Click on studio card
    
    // STEP 2: Open availability dialog
    await page.click('text=Set Availability')
    
    // STEP 3: Select time slots on calendar
    // Select Monday 10:00-12:00 (4 consecutive 30min slots)
    for (let i = 2; i <= 5; i++) {
      await page.click(`[data-testid="monday-slot-${i}"]`)
    }
    
    // Select Tuesday 14:00-16:00
    for (let i = 10; i <= 13; i++) {
      await page.click(`[data-testid="tuesday-slot-${i}"]`)
    }
    
    // STEP 4: Save availability
    await page.click('[data-testid="save-availability"]')
    
    // STEP 5: Verify availability was saved
    await expect(page.locator('text=Availability saved')).toBeVisible()
    
    // STEP 6: Verify calendar shows selected slots
    const mondaySlots = page.locator('[data-testid^="monday-slot-"].selected')
    await expect(mondaySlots).toHaveCount(4)
    
    const tuesdaySlots = page.locator('[data-testid^="tuesday-slot-"].selected')
    await expect(tuesdaySlots).toHaveCount(4)
  })

  test('teacher reviews and manages generated schedules', async ({ page }) => {
    // SETUP: Login and navigate to studio with students
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'teacher@test.com')
    await page.fill('[data-testid="password-input"]', 'securePassword123')
    await page.click('[data-testid="login-submit"]')
    await page.click('text=Test Music Studio')
    
    // STEP 1: Ensure we have some students enrolled (this might be setup data)
    // In a real test, you'd either create test data or mock it
    
    // STEP 2: Generate schedule
    await page.click('text=Generate Schedule')
    
    // STEP 3: Verify solver dialog appears
    await expect(page.locator('[data-testid="solve-dialog"]')).toBeVisible()
    
    // STEP 4: Configure solver settings
    await page.selectOption('[data-testid="consecutive-hours"]', '2') // 2 hour max
    await page.selectOption('[data-testid="break-length"]', '30') // 30min break
    
    // STEP 5: Run solver
    await page.click('[data-testid="solve-schedule"]')
    
    // STEP 6: Wait for solver to complete
    await expect(page.locator('text=Schedule generated')).toBeVisible({ timeout: 10000 })
    
    // STEP 7: Review results
    const scheduleTable = page.locator('[data-testid="schedule-results"]')
    await expect(scheduleTable).toBeVisible()
    
    // STEP 8: Verify assignments appear in calendar
    const assignments = page.locator('[data-testid^="assignment-"]')
    await expect(assignments.first()).toBeVisible()
    
    // STEP 9: Test manual adjustment
    await page.click('[data-testid="manual-adjust"]')
    // Drag an assignment to a different time slot
    const firstAssignment = assignments.first()
    const targetSlot = page.locator('[data-testid="monday-slot-6"]')
    await firstAssignment.dragTo(targetSlot)
    
    // STEP 10: Save adjusted schedule
    await page.click('[data-testid="save-schedule"]')
    await expect(page.locator('text=Schedule updated')).toBeVisible()
  })

  test('teacher sends schedules to students', async ({ page }) => {
    // SETUP: Login with existing schedule
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'teacher@test.com')
    await page.fill('[data-testid="password-input"]', 'securePassword123')
    await page.click('[data-testid="login-submit"]')
    await page.click('text=Test Music Studio')
    
    // STEP 1: Open send dialog
    await page.click('text=Send to Students')
    
    // STEP 2: Verify email preview
    const emailPreview = page.locator('[data-testid="email-preview"]')
    await expect(emailPreview).toBeVisible()
    await expect(emailPreview).toContainText('Your lesson schedule')
    
    // STEP 3: Customize email message
    await page.fill('[data-testid="email-message"]', 'Please confirm your lesson times!')
    
    // STEP 4: Select students to send to
    await page.check('[data-testid="select-all-students"]')
    
    // STEP 5: Send emails
    await page.click('[data-testid="send-emails"]')
    
    // STEP 6: Verify success message
    await expect(page.locator('text=Emails sent successfully')).toBeVisible()
    
    // STEP 7: Verify sent status in student list
    const sentBadges = page.locator('[data-testid="email-sent-badge"]')
    await expect(sentBadges.first()).toBeVisible()
  })

  test('handles scheduling conflicts and errors', async ({ page }) => {
    // SETUP: Login to studio
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'teacher@test.com')
    await page.fill('[data-testid="password-input"]', 'securePassword123')
    await page.click('[data-testid="login-submit"]')
    await page.click('text=Test Music Studio')
    
    // STEP 1: Try to generate schedule with insufficient availability
    // First, clear teacher availability to create conflict
    await page.click('text=Set Availability')
    await page.click('[data-testid="clear-all"]')
    await page.click('[data-testid="save-availability"]')
    
    // STEP 2: Try to generate schedule
    await page.click('text=Generate Schedule')
    await page.click('[data-testid="solve-schedule"]')
    
    // STEP 3: Verify error handling
    await expect(page.locator('text=Unable to schedule all students')).toBeVisible()
    await expect(page.locator('[data-testid="conflict-details"]')).toBeVisible()
    
    // STEP 4: View conflict resolution suggestions
    await page.click('[data-testid="view-suggestions"]')
    await expect(page.locator('text=Add more availability')).toBeVisible()
    
    // STEP 5: Fix the issue by adding availability
    await page.click('text=Add Availability')
    // Add Monday 9-17 availability
    for (let i = 0; i < 16; i++) {
      await page.click(`[data-testid="monday-slot-${i}"]`)
    }
    await page.click('[data-testid="save-availability"]')
    
    // STEP 6: Retry schedule generation
    await page.click('text=Generate Schedule')
    await page.click('[data-testid="solve-schedule"]')
    
    // STEP 7: Verify success this time
    await expect(page.locator('text=Schedule generated')).toBeVisible()
  })
})