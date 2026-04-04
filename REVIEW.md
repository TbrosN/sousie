# Code Review against SPEC.md

Here are the findings based on reviewing the React Native/Expo frontend and Python/FastAPI backend code against the provided specifications.

### 1. [FAIL] Discrepancy with SPEC & Dead Code: Recipe File Storage
- **Files**: `backend/app/recipe_store.py` (Line 23), `backend/app/chat_service.py` (Lines 38, 47), `backend/app/tools.py` (Line 55)
- **Details**: The SPEC explicitly mandates that "The recipe JSON is stored in a file, rather than being held in memory... lets the llm use file editing tools (e.g. string replace)". Currently, the `RecipeFileStore.load` method is never called (dead code). The backend writes the recipe to a file via `self._store.save(recipe)` during every request, but never reads from it. The `string_replace` tool operates on a freshly serialized string from the memory object instead of interacting with the file system. The memory object is used as the source of truth, rendering the file storage logic useless.

### 2. [WARN] Scalability Issue with Async Storage
- **Files**: `frontend/src/services/storageService.ts` (Line 16)
- **Details**: `StorageService.writeRecipes` saves the entire array of recipes as a single JSON string blob in AsyncStorage. While the SPEC mentions "Recipes are simply saved in async storage locally", it also mandates "structured JSON optimized for scaling". Over time, storing all recipes in a single string will exceed AsyncStorage limits and degrade performance. Recipes should ideally be saved under individual keys or via a lightweight local database wrapper (though SQLite is a non-goal, splitting keys is a standard approach).

### 3. [WARN] Redundant State Updates and Object Creation
- **Files**: `frontend/src/context/RecipesContext.tsx` (Line 72), `frontend/src/screens/RecipeEditorScreen.tsx` (Line 67)
- **Details**: `updatedAt` is attached to the recipe in the screen component and then immediately overwritten again inside the `updateRecipe` context method. Furthermore, the `activeRecipe` state in `RecipeEditorScreen` is updated twice upon a successful chat (once manually, and once via a `useEffect` triggering from the context update), which can cause redundant re-renders.

### 4. [WARN] Redundant Message Slicing
- **Files**: `frontend/src/services/backendClient.ts` (Line 40), `backend/app/chat_service.py` (Line 39)
- **Details**: Both the frontend and backend independently slice the chat messages (using `UI_NUMBERS.maxChatMessagesForRequest` and `MAX_CHAT_HISTORY`). Because the frontend already slices the array before sending the request, the backend slicing is redundant logic.

### 5. [WARN] Incomplete `.gitignore` rules for environment variables
- **Files**: `frontend/.gitignore` (Line 34)
- **Details**: The frontend `.gitignore` only ignores `.env*.local`. A standard `.env` file would accidentally be committed. The backend `.gitignore` properly ignores `.env`. Given the SPEC's strict warning about "NEVER expose environment variables", this is a risky oversight. 

### 6. [PASS] Error Handling and Logging
- **Files**: `backend/app/main.py` (Line 58), `frontend/src/screens/RecipeEditorScreen.tsx` (Line 74)
- **Details**: The codebase strictly adheres to the SPEC's error handling guidelines. Exceptions are caught at the top level and logged properly. The backend correctly raises HTTP exceptions with safe messages, and the frontend maps unexpected failures to a friendly UI constant (`UI_COPY.chatUnavailable`), ensuring users never see raw error messages.

### 7. [PASS] Dynamic Ingredient Quantities
- **Files**: `frontend/src/utils/recipeMath.ts` (Line 13)
- **Details**: Correctly computes the dynamic display amount for ingredients using the `ingredient.quantityPerServing * servings` formula precisely as required by the specification. Global amounts are properly calculated in `computeIngredientTotals`.

### 8. [PASS] Offline Behavior Constraints
- **Files**: `frontend/src/components/ChatBottomSheet.tsx` (Lines 74, 97)
- **Details**: Correctly disables the AI interaction button and shows an inline offline hint (`UI_COPY.offlineHint`) when the user's network connection drops, matching the required behavior exactly. The rest of the app and recipes remain viewable.

### 9. [PASS] UX and Design (Bottom Sheet Pattern)
- **Files**: `frontend/src/components/ChatBottomSheet.tsx`
- **Details**: Successfully implements the requested bottom sheet UX pattern. It defaults to a collapsed state with a single-line input fixed above the navigation area. The sheet expands to ~72% height (`UI_NUMBERS.expandedHeightRatio`) upon interaction and gracefully collapses using `PanResponder` swipe thresholds or keyboard dismiss gestures.