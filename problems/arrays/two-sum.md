# Two Sum

Difficulty: Easy

Description:
Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

Input: `nums = [2,7,11,15], target = 9`

Output: `[0,1]`

Example:
Input: `nums = [3,2,4], target = 6` → Output: `[1,2]`

Hints:
- Use a hash map to store value → index for O(n) lookup.
- For each number, check if `target - num` exists in the map (one-pass method).
- Watch out for using the same element twice.

Tags: Arrays, HashMap
