function extractArgs(text) {
  if (!text) return [];
  const [, ...rest] = text.trim().split(/\s+/);
  return rest;
}
test('extracts args after command', () => {
  expect(extractArgs('/setname John Doe')).toEqual(['John', 'Doe']);
});
