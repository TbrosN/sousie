import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { THEME } from "@/src/constants/theme";
import { DietProfileProvider } from "@/src/context/DietProfileContext";
import { RecipesProvider } from "@/src/context/RecipesContext";

export default function RootLayout() {
  return (
    <DietProfileProvider>
      <RecipesProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
            headerTintColor: THEME.color.textPrimary,
            headerStyle: {
              backgroundColor: THEME.color.backgroundCanvas,
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: THEME.color.backgroundApp,
            },
            headerTitleStyle: {
              color: THEME.color.textStrong,
              fontWeight: THEME.font.weightSemibold,
            },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Choose a Recipe" }} />
          <Stack.Screen name="diet-preferences" options={{ title: "Diet Preferences" }} />
          <Stack.Screen name="recipes/[recipeId]" options={{ title: "Recipe Editor" }} />
        </Stack>
      </RecipesProvider>
    </DietProfileProvider>
  );
}
