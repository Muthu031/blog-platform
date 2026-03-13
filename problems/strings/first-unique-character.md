# First Unique Character in a String

Difficulty: Easy

Description:
Given a string `s`, find the first non-repeating character and return its index. If it does not exist, return `-1`.

Input: `s = "leetcode"`

Output: `0`

Hints:
- Use a hash map to count occurrences, then scan again to find the first char with count 1.
- Alternatively, track first index and count, then choose the smallest index with count 1.

Tags: Strings, HashMap
