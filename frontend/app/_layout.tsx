import { Stack } from "expo-router";
import { RecipesProvider } from "@/src/context/RecipesContext";

export default function RootLayout() {
  return (
    <RecipesProvider>
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
        }}
      >
        <Stack.Screen name="index" options={{ title: "My Recipes" }} />
        <Stack.Screen name="recipes/[recipeId]" options={{ title: "Recipe" }} />
      </Stack>
    </RecipesProvider>
  );
}
