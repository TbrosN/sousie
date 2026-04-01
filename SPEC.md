# App Specification

## Overview

This is a mobile app that is a cooking assistant; it uses AI to collaboratively create a recipe with the user, and then walks the user through making the recipe step-by-step in real time. The user can either brainstorm recipes with the AI or provide a full recipe and either use it directly or make revisions to it with the help of the AI.

## Core Features

- AI recipe brainstorming/editing/parsing
    - Easy portion adjustments: "I only have X grams of lentils, scale the recipe accordingly"
    - Ingredient additions/removals: "I want to add X" or "I don't have/like Y"
    - Ingredient substitutes: "I'm allergic to X" or "trying to avoid Y". The AI suggests suitable substitute ingredients, lets the user choose one, and then updates the recipe.
    - Users can provide a full recipe as copy/pasted text
- Real time step-by-step walkthrough during cooking
    - Considers parallelism during the recipe: while X is baking in the oven, you can start chopping Y. This makes the cooking more efficient. This parallelism schedule is decided at recipe creation time, and manifests as the ordering of the cooking steps.
    - Does not assume that the user has measuring cups or other devices: The AI model gives intuitive estimates of what "1 cup" or "100g" looks like for each ingredient.
    - User can go back to previous steps in case they missed something
- Recipe saving: users can save recipes and reuse them back later.
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
- **Third-party APIs:** Google Gemini API for the AI features. We will use Flash 2.5.

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
- User is notified when timer is nearly done (1 minute remiaining for longer times), and when any timer finishes.

## Offline Behavior

- Recipe generation should NOT work when user is offline, as this requires access to an AI API.
    - However, users can still scale the recipe portions, as this is a basic non-AI dependent feature
- However, already saved recipes should be usable, and the user should be able to cook them and have access to the timer feature, etc.

## Error Handling & Logging

- All exceptions will be caught and logged either as warnings or errors.
    - Error log for fatal errors. These result in broken app functionality
    - Warning log for non-fatal errors
    - Ensure that logging will reach the terminal running the app, and not just the client-side console
    - Top-level functions should log the warning or error at the end. Other functions simply re-raise the exception with their error message in it. This ensures that we don't have duplicate error logs, and that we have sufficient information about the call stack.
    - Handle errors gracefully; we should never show users raw error messages. Instead, users should be met with a clear, understandable message that doesn't break the UI.

- Examples of errors that might occur:
    - API call to Gemini, supabase, or clerk fails (fatal)
    - LLM outputs invalid recipe that can't be parsed
        - In this case, we should automatically retry and tell the LLM the error. But after a few retries, we give up and this becomes a fatal error, with a user-facing error msg.

- If user closes app during cooking phase and reopens:
    - All timers should continue, unpaused during the close/reopen
    - User should be returned to the cooking step they were on

## Constraints & Non-Goals

- This app does NOT use the camera or any computer vision. It is meant to be a recipe creation tool + cooking assistant that the user can refer back to during the cooking process.
- Do not create interactions that would be difficult for a user whose hands are wet or dirty, as this is a common state for a cook in action

## UX and Design Considerations

- To the extent possible, our app should support hands-free or hands-minimal interactions. To this end, we must ensure that interactions are simple and can reasonably be performed without picking up the phone.
    - This means text should also be large enough to be readable if the phone is sitting on a countertop a few feet away, and not in the user's hand.
- The app must not close and the phone must not turn off during the cooking phase, for the reasons above
- Users can exit the recipe cooking phase and go back to the planning phase.

## Future features

- Voice control: ask questions or navigate questions via voice in case your hands are full or dirty while cooking
- Sharing: users can easily share recipes with their friends via a share button.
- Dietary preferences: Users can save dietary preferences like allergies, foods to avoid, etc. to their profile
- Onboarding flow: help prevent the cold-start problem for new users, and make sure they have some recipes to start themselves off
- Token limits: implement a credit system to limit usage per user
