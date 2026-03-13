# Contains Duplicate

Difficulty: Easy

Description:
Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.

Input: `nums = [1,2,3,1]`

Output: `true`

Hints:
- Use a hash set to track seen values; return early if a duplicate is found.
- Sorting also works (then check adjacent elements) but costs O(n log n).

Tags: Arrays, HashSet
