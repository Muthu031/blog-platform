# Backspace String Compare

Difficulty: Easy

Description:
Given two strings `s` and `t`, return `true` if they are equal when both are typed into empty text editors. `#` means a backspace character.

Input: `s = "ab#c", t = "ad#c"`

Output: `true` (both become "ac")

Hints:
- Simulate typing using a stack for each string or use two-pointer technique iterating from the end and skipping characters.
- Aim for O(n) time and O(1) extra space with the two-pointer skip method.

Tags: Stack, Two Pointers
