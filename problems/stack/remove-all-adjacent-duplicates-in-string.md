# Remove All Adjacent Duplicates In String

Difficulty: Easy

Description:
Given a string `s`, repeatedly remove pairs of adjacent duplicate characters and return the final string after all such removals.

Input: `s = "abbaca"`

Output: `"ca"`

Hints:
- Use a stack (or build a result string) and compare current char with stack top to pop when equal.
- This is effectively simulating removals in one pass O(n) time.

Tags: Stack, String
