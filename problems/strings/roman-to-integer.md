# Roman to Integer

Difficulty: Easy

Description:
Convert a Roman numeral to an integer. Input is guaranteed to be within the range from 1 to 3999.

Input: `s = "MCMXCIV"`

Output: `1994`

Hints:
- Map Roman characters to values and process left-to-right; if a smaller value appears before a larger one, subtract it.
- Alternatively, process right-to-left tracking the previous value.

Tags: Strings
