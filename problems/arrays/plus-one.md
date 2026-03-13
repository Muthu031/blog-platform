# Plus One

Difficulty: Easy

Description:
Given a non-empty array of decimal digits representing a non-negative integer, increment one to the integer. The digits are stored such that the most significant digit is at the head of the list.

Input: `digits = [1,2,3]`

Output: `[1,2,4]`

Example:
Input: `digits = [9,9]` → Output: `[1,0,0]`

Hints:
- Process digits from the end; handle carry as you go.
- If carry remains after processing all digits, insert `1` at the front.
- Time O(n), space O(1) (in-place) if allowed.

Tags: Arrays
