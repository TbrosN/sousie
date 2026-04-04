import { useLocalSearchParams } from "expo-router";

import { RecipeEditorScreen } from "@/src/screens/RecipeEditorScreen";

export default function RecipeRoute() {
  const params = useLocalSearchParams<{ recipeId?: string }>();
  return <RecipeEditorScreen recipeId={params.recipeId ?? ""} />;
}
