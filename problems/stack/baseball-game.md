# Baseball Game

Difficulty: Easy

Description:
You are keeping score for a baseball game with operations given as a list of strings. Apply operations and return the sum of the scores.

Example operations: `["5","2","C","D","+"]`

Output: `30` (after applying operations)

Hints:
- Use a stack to record valid round scores; `C` removes last, `D` doubles last, `+` sums last two.
- Process operations sequentially and maintain current total via the stack.

Tags: Stack
