# Valid Parentheses

Difficulty: Easy

Description:
Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if open brackets are closed by the same type and in the correct order.

Input: `s = "()[]{}"`

Output: `true`

Hints:
- Use a stack to push opening brackets and match on closing brackets.
- Return false when a closing bracket has no matching opening bracket on the stack.

Tags: Stack
