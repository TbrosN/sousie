# App Specification

## Overview

This is a mobile app targeting Android that uses AI to help people create and edit recipes.

## App Structure

- Frontend (sousie/frontend): Expo Android native app. Handles the frontend screens and components.
- Backend (sousie/backend): FastAPI python server. This handles all LLM-related logic and API calls.

## Core Features

**AI Chatbot**
The app takes form as an editable recipe canvas + chatbot, analogous to cursor's code + chatbot UI. See the UX and Design section below for more details.

Examples of things that user should be able to accomplish via chat:

- Easy portion adjustments: "I only have X grams of lentils"
  - The llm does not handle portion scaling; we do this ourselves deterministically in application logic,
    simply by multiplying the numbers. We can provide this as a tool call to the llm.
- Ingredient additions/removals: "I want to add X" or "I don't have/like Y"
- Ingredient substitutes: "I'm allergic to X" or "trying to avoid Y". The AI suggests suitable substitute ingredients, lets the user choose one, and then updates the recipe.

**Recipe Saving**
Recipes are simply saved in async storage locally on the user's device. This avoids the need for a database.

## Data Model

- User: has a list of saved recipes, saved in async storage.

**Recipe Storage**

- Recipe is stored as structured JSON optimized for scaling and step-level ingredient tracking:
- `num_servings` : number of servings to make; allows user to scale the recipe up or down
- `steps`: ordered list of step objects; list order determines execution order
Each step contains:
  - `instructions`: step instructions
  - `ingredients`: list of objects referencing recipe ingredients used in this step:
    - `name` (matches recipe ingredient)
    - `quantity_per_serving` used in this step
    - `unit`

 

- Displayed quantities are computed dynamically:
`ingredient.quantity_per_serving × current_servings`
- Global recipe ingredient amounts are calculated by summing across all steps, including the current_servings scale factor

## Platform Targets

- iOS
- Android
- Web

We will only be testing on Android, so that is the top priority. But we want this app to work on iOS as well, ideally.

## Notifications & Background Tasks

- We do NOT use any notifications or background tasks.

## Offline Behavior

- Recipe generation should NOT work when user is offline, as this requires access to an AI API.
  - We should show this in the UI: Chatbot features are visibly disabled, with a small hint like "You're offline. Get back online to activate AI features"
- However, already saved recipes should be viewable

## Error Handling & Logging

- All exceptions will be caught and logged either as warnings or errors.
  - Error log for fatal errors. These result in broken app functionality
  - Warning log for non-fatal errors
  - Ensure that logging will reach the terminal running the app, and not just the client-side console
  - Top-level functions should log the warning or error at the end. Other functions simply re-raise the exception with their error message in it. This ensures that we don't have duplicate error logs, and that we have sufficient information about the call stack.
  - Handle errors gracefully; we should never show users raw error messages. Instead, users should be met with a clear, understandable message that doesn't break the UI.

## Recipe LLM Agent Design

**Chatbot Integration**

- Chat interface maintains recent message history (~5–10 messages)
- Each request includes:
  - system prompt
  - recent chat messages
  - current recipe JSON
- Recipe is the authoritative source of truth; AI edits modify the recipe JSON
- Chat functions as a collaborative layer over recipe state; the AI can suggest edits or tool calls
- No separate “read recipe” tool is required; the model sees the recipe in context
- The recipe JSON is stored in a file, rather than being held in memory. This lets us avoid holding a large recipe in memory for a long time, and also lets the llm use file editing tools (e.g. string replace) that is more familiar from training data.

---

**Tool Support (LangChain)**

- Tools are implemented via LangChain to allow structured actions on the recipe
- Example: `set_servings` tool to scale the recipe

```python
from langchain.tools import Tool

def set_servings(recipe: dict, servings: int) -> dict:
    recipe.num_servings = servings
    return recipe

scale_tool = Tool(
    name="set_servings",
    func=set_servings,
    description="Update the number of servings for the recipe"
)
```

- Additional tools may include: ingredient substitution
- LLM can call a string replace tool to modify the recipe state
  - This lets it make smaller edits to the recipe file

## Constraints & Non-Goals

This app is a stripped-down MVP containing just the core features we need to test on users. Keep the following non-goals and constraints in mind throughout your implementation and planning:

- This app does NOT use the camera or any computer vision
- The focus of this app is recipe creation and editing. It does NOT assist the user during the cooking process.
- There is NO authentication or database mechanism for this app.

## UX and Design Considerations

**Recipe Screen + AI Chat (Bottom Sheet Pattern)**

The primary interface is a full-screen recipe view, which serves as the main source of truth. The recipe is displayed in a structured, highly readable format (ingredients, steps, metadata), optimized for quick scanning and interaction.

An AI chat interface is implemented as a bottom sheet anchored to the bottom of the screen.

**Default (Collapsed) State**

- The bottom sheet is collapsed by default.
- Only a single-line chat input field is visible (e.g., “Ask AI to modify this recipe…”).
- The input is always visible and fixed above system navigation.
- No chat history is shown in this state.

**Expansion Behavior**

- Tapping the input field:
  - Expands the bottom sheet to ~60–80% of screen height.
  - Automatically focuses the input and opens the keyboard.
- Users can also drag the sheet upward to expand.
- The expanded view contains:
  - Scrollable chat history
  - Input field anchored at the bottom
- The recipe view remains visible but dimmed or partially obscured behind the sheet.

**Collapse Behavior**

- Users can:
  - Swipe the sheet downward, or
  - Dismiss via system back gesture/button
- On collapse:
  - Keyboard is dismissed
  - Only the input field remains visible

**Interaction Model**

- Chat is treated as a supporting tool, not the primary interface.
- All AI interactions originate from the input field and result in proposed changes to the recipe.
- Recipe content is updated outside the chat surface (in the main view), maintaining clear separation between conversation and output.

**Design Rationale**

- Keeps focus on the recipe while making AI assistance continuously accessible
- Matches common mobile interaction patterns for secondary surfaces
- Enables one-handed use and minimizes context switching

## Style Guidelines

- Make sure to keep the code modular: each file should have a clear responsibility, and we should organize the repo into appropriate folders, files, and helper functions.
- Avoid magic numbers and hard-coded strings. Instead, use `constants.py` files so there's a single source of truth that is easy to update.
- Clean up dead code: if you create a file or function that ends up not being used, you must remove it
- Use OOP: avoid complex string dictionary structures for storing objects; instead, opt for classes (including dataclasses or Pydantic objects)
- IMPORTANT: NEVER expose environment variables on the frontend. All frontend environment variables are effectively public. Any sensitive variabels like secret API keys should be stored on the backend.
  - Furthermore, ensure that any .env files are in the appropriate gitignore files

## Future features

These will NOT be implemented yet, but are things to keep in mind as possible extensions in the future.

- Voice control: ask questions or navigate questions via voice in case your hands are full or dirty while cooking
- Sharing: users can easily share recipes with their friends via a share button.
- Dietary preferences: Users can save dietary preferences like allergies, foods to avoid, etc. to their profile
- Onboarding flow: help prevent the cold-start problem for new users, and make sure they have some recipes to start themselves off
- Token limits: implement a credit system to limit usage per user
- Real time step-by-step walkthrough during cooking
  - Considers parallelism during the recipe: while X is baking in the oven, you can start chopping Y. This makes the cooking more efficient. This parallelism schedule is decided at recipe creation time, and manifests as the ordering of the cooking steps.
  - Does not assume that the user has measuring cups or other devices: The AI model gives intuitive estimates of what "1 cup" or "100g" looks like for each ingredient.
  - User can go back to previous steps in case they missed something
- Recipe saving: users can save recipes and reuse them back later.
- Easy timers: For steps that may require a timer, our app has a timer feature. Users can create multiple timers running at the same time, and are notified when a timer finishes or is close to finishing (for longer times). Timers are labeled appropriately so the user knows which is which.

