# Middle of the Linked List

Difficulty: Easy

Description:
Given the head of a singly linked list, return the middle node. If there are two middle nodes, return the second middle node.

Input: `head = [1,2,3,4,5]`

Output: `[3]` (node with value 3)

Hints:
- Use slow and fast pointers: move `fast` two steps and `slow` one step; when `fast` reaches the end, `slow` is at middle.
- This runs in O(n) time and O(1) space.

Tags: Linked List, Two Pointers
