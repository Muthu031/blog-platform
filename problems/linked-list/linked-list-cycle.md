# Linked List Cycle

Difficulty: Easy

Description:
Given a linked list, determine if it has a cycle in it.

Input: `head = [3,2,0,-4]` with tail connecting to node index 1

Output: `true`

Hints:
- Use Floyd's Tortoise and Hare algorithm (slow and fast pointers) to detect a cycle in O(n) time and O(1) space.
- If `slow` meets `fast`, a cycle exists.

Tags: Linked List, Two Pointers
