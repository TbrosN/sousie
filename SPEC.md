# App Specification

## Overview

This is a mobile app that is a cooking assistant; it uses AI to collaboratively create a recipe with the user, and then walks the user through making the recipe step-by-step in real time. The user can either brainstorm recipes with the AI or provide a full recipe and either use it directly or make revisions to it with the help of the AI.

## Core Features

- AI recipe brainstorming/editing/parsing
    - Easy portion adjustments: "I only have X grams of lentils, scale the recipe accordingly"
    - Ingredient additions/removals: "I want to add X" or "I don't have/like Y"
    - Ingredient substitutes: "I'm allergic to X" or "trying to avoid Y". The AI suggests suitable substitute ingredients, lets the user choose one, and then updates the recipe.
- Real time step-by-step walkthrough during cooking
    - Considers parallelism during the recipe: while X is baking in the oven, you can start chopping Y. This makes the cooking more efficient.
    - Does not assume that the user has measuring cups or other devices: The AI model gives intuitive estimates of what "1 cup" or "100g" looks like for each ingredient.
- Recipe saving: users can save recipes and reuse them back later.
- Sharing: users can easily share recipes with their friends via a share button.
- Easy timers: For steps that may require a timer, our app has a timer feature. Users can create multiple timers running at the same time, and are notified when a timer finishes or is close to finishing (for longer times). Timers are labeled appropriately so the user knows which is which.

## Screens & Navigation

| Screen | Purpose | Navigation |
|--------|---------|------------|
|Recipe Creation| collaborative AI recipe importation/editing/creation        |when finished, can proceed to the realtime cooking assistant|
|Cooking assistant| While user is cooking, they are shown step-by-step instructions in a digestible way that is considerate of the fact that they are cooking and using their hands. We show one step at a time, ensure the device stays on so user doesn't need to keep reopnening it, and provide reminders/hints about ingredient portions.|

## Data Model

- User: has a list of recipes.
- Recipes: A recipe consists of the following data (feel free to modify this slightly if needed during the implementation):
    - Ingredients: contains an amount (number + units) and name
    - Steps: each step has a time (optional, with units of minutes or seconds), list of ingredients, and instructions text

## API & Backend

- **Authentication:** Clerk + supabase. Refer to the docs for information on how to do this integration: https://supabase.com/partners/integrations/clerk, https://clerk.com/docs/guides/development/integrations/databases/supabase
- **Database:** Supabase. Refer to the data model above.
- **Third-party APIs:** Google Gemini API for the AI features

## Design & Branding

- **Color palette:** The colors should be light and clean. Choose an appropriate color pallete with good harmony.
- **Typography:** Choose font(s) that complement each other well and are easy to read. Prioritize clarity primarily.
- **Style direction:** The app should feel minimal and simple. This should be mostly hands-free during the cooking stage because users might have wet or dirty hands during the cooking process.

## Platform Targets

- [X] iOS
- [X] Android
- [ ] Web

We will primarily test on Android, although since we're using Expo, we should get iOS and Web support out of the box. Web is low-priority, but Android and iOS MUST work properly.

## Notifications & Background Tasks

- The app must stay open and phone must stay on during the cooking phase. We don't want the user to have to keep turning on their phone every time they need to re-check the instructions.
- The timers must stay running even if the app is closed, since we don't want users to accidentally lose their timers. Similarly, timers should continue counting down even if the phone sleeps.
- User is notified when timer is nearly done (for longer times), and when any timer finishes.

## Offline Behavior

- Recipe generation should NOT work when user is offline, as this requires access to an AI API.
- However, already saved recipes should be usable, and the user should be able to cook them and have access to the timer feature, etc.

## Analytics & Monitoring

<!-- Tracking events, crash reporting, performance monitoring. -->

## Constraints & Non-Goals

<!-- Known limitations, things explicitly out of scope, or technical constraints. -->

## Open Questions

<!-- Unresolved decisions or areas needing further research. -->
