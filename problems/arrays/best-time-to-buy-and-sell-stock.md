# Best Time to Buy and Sell Stock

Difficulty: Easy

Description:
Given an array `prices` where `prices[i]` is the price of a given stock on day `i`, find the maximum profit you can achieve. You may complete at most one transaction (buy one and sell one share of the stock).

Input: `prices = [7,1,5,3,6,4]`

Output: `5` (buy at 1, sell at 6)

Hints:
- Track the minimum price seen so far and compute profit candidate at each day.
- Single pass O(n) time and O(1) space.

Tags: Arrays, Greedy
