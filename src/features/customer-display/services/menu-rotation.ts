export function getNextCategoryIndex(currentIndex: number, categoryCount: number) {
  if (categoryCount <= 0 || currentIndex < 0 || currentIndex >= categoryCount - 1) {
    return 0;
  }

  return currentIndex + 1;
}
