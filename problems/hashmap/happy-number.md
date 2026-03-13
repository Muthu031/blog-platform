# Happy Number

Difficulty: Easy

Description:
Given a positive integer `n`, repeatedly replace the number by the sum of the squares of its digits. Return `true` if this process ends in 1, otherwise `false` (it will loop forever in a cycle not including 1).

Input: `n = 19`

Output: `true` (19 → 82 → 68 → 100 → 1)

Hints:
- Use a set to detect cycles (seen numbers). If you see a number again, it's not happy.
- Implement a helper to compute sum of squares of digits. Typical time is small because numbers shrink quickly.

Tags: HashMap, Simulation
