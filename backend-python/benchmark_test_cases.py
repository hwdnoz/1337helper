"""
Test cases for RAG benchmark
Designed to expose weaknesses in simple chunking strategies
"""

# Test documents that expose chunking weaknesses
doc1 = """
Q: How do I optimize a two-pointer solution for the three-sum problem?

This is one of the most common questions in coding interviews and appears frequently on LeetCode.
The two-pointer technique is extremely efficient for solving array problems, particularly when
dealing with sorted arrays or when you need to find pairs or triplets that satisfy certain conditions.
Let me walk you through the complete approach with all the critical optimizations that will help
you pass all test cases efficiently.

BACKGROUND: The three-sum problem asks you to find all unique triplets in an array that sum to zero.
A naive approach would use three nested loops (O(n³)), but we can do much better using sorting and
two pointers to achieve O(n²) time complexity. This optimization is crucial for handling large inputs
within time limits.

A: First, you must sort the array. This is absolutely crucial because the two-pointer technique
fundamentally relies on the sorted property to work correctly. Sorting takes O(n log n) time, but
it enables the O(n²) two-pointer search that follows. After sorting, you iterate through each element
as a potential first element of the triplet, and use two pointers starting from opposite ends of the
remaining array to find pairs that complete the triplet.

The algorithm works like this: Fix the first element at index i, then use left pointer at i+1 and
right pointer at the end of the array. Calculate the sum of nums[i] + nums[left] + nums[right].
If the sum is too small, increment left. If too large, decrement right. If equal to target, you
found a valid triplet!

THE CRITICAL OPTIMIZATION: To skip duplicates, you need to check if nums[left] == nums[left-1]
after finding a valid triplet. Use a while loop: while left < right and nums[left] == nums[left-1]: left += 1
This prevents adding duplicate triplets to your result and significantly improves performance. You should
also skip duplicate values for the first element: if i > 0 and nums[i] == nums[i-1], continue to next iteration.

ADDITIONAL TIPS: You can also add an early termination condition. If nums[i] > 0, break the loop since
all remaining numbers will be positive (array is sorted) and cannot sum to zero. Similarly, if
nums[i] + nums[i+1] + nums[i+2] > 0, you can break early. These small optimizations can significantly
reduce runtime on large test cases.

COMMON MISTAKES: Remember to check array bounds before accessing elements. The left pointer should
start at i+1, not 0. Don't forget to skip duplicates for all three positions, not just one. And make
sure to move both pointers after finding a valid triplet, not just one of them.

Time Complexity: O(n²) for the two nested loops, plus O(n log n) for sorting, so overall O(n²).
Space Complexity: O(1) or O(n) depending on the sorting algorithm used. The output array doesn't count
toward space complexity in most interview contexts.
"""

doc2 = """
COMPLETE PALINDROME SOLUTION GUIDE FOR LEETCODE

Palindrome problems are extremely common in coding interviews. They test your understanding of string
manipulation, two-pointer techniques, and optimization strategies. Let me provide you with a comprehensive
guide covering multiple approaches from brute force to optimal solutions.

APPROACH 1: BRUTE FORCE WITH HELPER FUNCTION

First, let's define a clean helper function that checks if a string is a palindrome. This is a reusable
utility that you'll want in your coding toolkit:

def is_palindrome(s: str) -> bool:
    '''Check if string is a palindrome'''
    clean = ''.join(c.lower() for c in s if c.isalnum())
    return clean == clean[::-1]

This helper function is crucial because it handles all the edge cases: removing non-alphanumeric characters,
converting to lowercase for case-insensitive comparison, and using Python's elegant slice notation [::-1]
to reverse the string. Time complexity is O(n) and space complexity is O(n) due to creating the reversed string.

Now for the main solution that finds the longest palindrome substring using the brute force approach:

def longest_palindrome_substring(s: str) -> str:
    '''Find longest palindrome in string - O(n³) brute force'''
    if not s:
        return ""

    longest = ""
    for i in range(len(s)):
        for j in range(i + 1, len(s) + 1):
            substring = s[i:j]
            if is_palindrome(substring) and len(substring) > len(longest):
                longest = substring

    return longest

The key insight here is using the helper function is_palindrome defined earlier to check each substring.
This approach works but is slow: O(n³) time complexity because we have two nested loops O(n²) to generate
all substrings, and each palindrome check takes O(n). For interview purposes, you should mention this
limitation and discuss optimization strategies.

APPROACH 2: EXPAND AROUND CENTER (OPTIMAL)

A much better approach is to expand around each possible center. For each position, we treat it as a
potential center of a palindrome and expand outward while characters match:

def longest_palindrome_optimized(s: str) -> str:
    '''Find longest palindrome - O(n²) optimal solution'''
    if not s:
        return ""

    def expand_around_center(left: int, right: int) -> str:
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        return s[left+1:right]

    longest = ""
    for i in range(len(s)):
        # Check odd-length palindromes (center is a single character)
        odd_palindrome = expand_around_center(i, i)
        # Check even-length palindromes (center is between two characters)
        even_palindrome = expand_around_center(i, i+1)

        longest = max(longest, odd_palindrome, even_palindrome, key=len)

    return longest

This optimization reduces time complexity to O(n²) with O(1) space. Much better for large inputs!

KEY TAKEAWAYS: Always start with the helper function approach for clarity, then optimize. Remember to
handle both odd and even length palindromes. The expand-around-center technique is a common pattern
you'll see in many string problems.
"""

doc3 = """
MASTERING THE SLIDING WINDOW TECHNIQUE

The sliding window technique is one of the most powerful and versatile patterns for solving array and
string problems efficiently. It's extensively used in LeetCode problems and real-world applications.
Understanding this pattern deeply will help you recognize and solve dozens of related problems quickly.

WHAT IS SLIDING WINDOW?

The sliding window technique involves maintaining a "window" (a contiguous sequence of elements) that
slides across the data structure. Instead of recalculating values from scratch for each position, we
efficiently update our window by adding new elements and removing old ones. This transforms many O(n²)
brute force solutions into elegant O(n) solutions.

Common problems that use this technique include: maximum sum subarray of size k, longest substring
without repeating characters, minimum window substring, longest substring with at most k distinct
characters, permutation in string, and many more. Once you master the pattern, you'll recognize it
instantly in new problems.

THE BASIC MECHANICS:

The basic idea is to maintain a window that slides across the array or string. You expand the window
by moving the right pointer forward to include new elements, and shrink it by moving the left pointer
forward to exclude elements that violate your constraint. This creates a dynamic window that adjusts
its size based on the problem requirements.

Here's the general template:

left = 0
for right in range(len(array)):
    # Add array[right] to window
    update_window_state()

    while window_condition_violated():
        # Remove array[left] from window
        left += 1
        update_window_state()

    # Update result if current window is valid
    update_result()

PERFORMANCE CHARACTERISTICS - THE KEY ADVANTAGE:

This is where sliding window really shines. Let's break down the complexity analysis carefully:

- Space complexity: O(1) if using just pointers for numeric problems, O(k) if you need to store
  window elements in a hash map or set (where k is the window size or number of distinct elements)

- Time complexity: O(n) where n is the array length - THIS IS THE KEY ADVANTAGE that makes sliding
  window so powerful. Even though there's a nested while loop, each element is visited at most twice:
  once when the right pointer passes it (adding to window), and once when the left pointer passes it
  (removing from window). This is amortized O(n), not O(n²)!

COMMON PATTERNS AND VARIATIONS:

1. Fixed window size: The window size k is constant. You slide it across and track some property.
   Example: Maximum sum of subarray of size k.

2. Variable window size: The window expands and contracts based on a condition. You typically want
   to find the maximum/minimum window that satisfies some constraint.
   Example: Longest substring with at most k distinct characters.

3. Two pointers moving in same direction: Both pointers only move forward, never backward. This is
   the classic sliding window pattern that guarantees O(n) time.

COMMON MISTAKES TO AVOID:

- Forgetting to update window state when shrinking (moving left pointer)
- Not handling edge cases like empty arrays or windows
- Confusing when to update the result (before or after shrinking the window)
- Assuming you need to reset left pointer to 0 (you don't - it only moves forward!)

PRO TIPS:

- Use hash maps to track character/element frequencies in the window
- For substring problems, consider using arrays of size 128 or 256 for ASCII character counting
- Draw out examples and manually slide the window to understand the state transitions
- Practice recognizing when a problem can be solved with sliding window vs when you need different approaches
"""

doc4 = """
COMPREHENSIVE COMPARISON OF SORTING ALGORITHMS: QUICKSORT VS MERGESORT

Sorting algorithms are fundamental to computer science and frequently tested in interviews. Understanding
the tradeoffs between different sorting approaches is crucial for both theoretical knowledge and practical
application. Let's do a deep dive comparing two of the most important divide-and-conquer sorting algorithms.

QUICKSORT - THE PRACTICAL CHAMPION

QuickSort is often the go-to sorting algorithm in practice, despite not having the best worst-case performance.
Here's why it's so popular and when you should use it:

Time Complexity Analysis:
- Average case: O(n log n) - This is what you'll see in practice 99% of the time
- Best case: O(n log n) - When pivot selections are balanced
- Worst case: O(n²) - When pivot is always the smallest or largest element (rare with good pivot selection)

Space Complexity:
- O(log n) due to recursion stack depth
- This is a MAJOR ADVANTAGE - it's an in-place sorting algorithm
- No extra array needed for merging like in MergeSort

Key Characteristics:
- In-place: YES - This is one of QuickSort's biggest advantages. It sorts with minimal extra memory.
- Stable: NO - Equal elements may not maintain their relative order. This can be a dealbreaker for some applications.
- Pivot selection critically affects performance - use median-of-three or random pivot to avoid worst case
- Faster in practice due to excellent cache locality - elements are compared and swapped in nearby memory locations
- Tail recursion optimization possible for better space usage

When to use QuickSort:
- When you need fast average-case performance and have limited memory
- When stability doesn't matter (sorting primitive types like integers)
- For general-purpose sorting where worst-case is unlikely
- When cache performance matters (sorting large datasets that fit in memory)

MERGESORT - THE RELIABLE WORKHORSE

MergeSort is the algorithm you use when you need guaranteed performance and stability. It's more predictable
than QuickSort but uses more memory:

Time Complexity Analysis:
- Average case: O(n log n)
- Best case: O(n log n)
- Worst case: O(n log n) - GUARANTEED! This is a huge advantage over QuickSort
- No matter what the input looks like, you always get O(n log n) performance

Space Complexity:
- O(n) - Needs an extra array for merging
- This is a MAJOR DISADVANTAGE - not in-place
- The extra space requirement can be prohibitive for very large datasets

Key Characteristics:
- In-place: NO - Requires O(n) extra space for the temporary merge array
- Stable: YES - This is crucial! Preserves relative order of equal elements
- Divide and conquer with a merge step that combines sorted subarrays
- Better for linked lists - can be implemented with O(1) extra space for linked lists
- More predictable performance - no worst-case scenarios to worry about
- Parallelizes well - each recursive call can be executed independently

When to use MergeSort:
- When stability is required (sorting objects by multiple fields)
- When you need guaranteed O(n log n) worst-case performance
- For sorting linked lists (where it can be in-place)
- When the dataset is too large to fit in cache anyway
- In external sorting scenarios (sorting data on disk)

THE KEY DIFFERENCES - DECISION FRAMEWORK:

Memory vs Stability: QuickSort is in-place but unstable, MergeSort is stable but needs extra space. This is
often the deciding factor. If you're sorting objects where order matters, use MergeSort. If you're sorting
primitives and want to save memory, use QuickSort.

Worst-Case Guarantees: MergeSort always runs in O(n log n), while QuickSort can degrade to O(n²). For
time-critical systems where predictability matters, MergeSort is safer.

Cache Performance: QuickSort typically performs better in practice because it has better cache locality.
It compares and swaps nearby elements, while MergeSort scatters memory accesses during the merge phase.

Practical Recommendations:
- Use QuickSort (or its variant IntroSort) for general-purpose sorting in most languages
- Use MergeSort when you need stability or guaranteed performance
- For small arrays (n < 10), use insertion sort instead
- Many modern languages use hybrid approaches (Timsort in Python combines MergeSort and insertion sort)

Interview Tips: Always mention both time and space complexity, discuss the stability tradeoff, and explain
that practical implementations often use hybrid approaches combining multiple algorithms.
"""

doc5 = """
DYNAMIC PROGRAMMING: UNDERSTANDING MEMOIZATION VS TABULATION

Dynamic Programming (DP) is one of the most powerful algorithmic techniques, but it's also one of the most
challenging to master. Many candidates struggle with DP problems in interviews because they don't understand
the fundamental difference between the two main approaches: memoization (top-down) and tabulation (bottom-up).

MEMOIZATION (TOP-DOWN APPROACH):

Memoization starts with the original problem and breaks it down recursively, storing (caching) the results
of subproblems to avoid redundant calculations. It's essentially recursion with caching.

Characteristics:
- Uses recursion with a cache (usually a hash map or array)
- Solves problems on-demand (only computes what's needed)
- More intuitive for beginners - mirrors the recursive problem definition
- May have stack overflow issues for deep recursion
- Typically uses O(n) extra space for both cache and call stack

Example for Fibonacci:
```python
def fib_memo(n, cache={}):
    if n in cache:
        return cache[n]
    if n <= 1:
        return n
    cache[n] = fib_memo(n-1, cache) + fib_memo(n-2, cache)
    return cache[n]
```

TABULATION (BOTTOM-UP APPROACH):

Tabulation builds up the solution from the base cases, iteratively filling a table (usually an array).
It starts from the smallest subproblems and works up to the final answer.

Characteristics:
- Uses iteration with a table (array)
- Solves all subproblems whether needed or not
- No recursion overhead - faster in practice
- No stack overflow risk
- Can often optimize space complexity

Example for Fibonacci:
```python
def fib_tab(n):
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]
```

WHICH SHOULD YOU USE?

Memoization is better when:
- The recursive solution is straightforward and intuitive
- You don't need to solve all subproblems
- The problem naturally fits a top-down approach

Tabulation is better when:
- You need optimal space complexity
- You want better runtime performance (no recursion overhead)
- The problem has clear dependencies and build-up order
"""

doc6 = """
BINARY SEARCH: BEYOND THE BASICS

Binary search is deceptively simple, yet implementing it correctly is notoriously difficult. Donald Knuth
once said that while the first binary search was published in 1946, the first bug-free implementation
didn't appear until 1962. Let's master it properly.

THE CORE ALGORITHM:

Binary search works on sorted arrays by repeatedly dividing the search space in half. If the target is
less than the middle element, search the left half. If greater, search the right half. Continue until
found or search space is exhausted.

Time Complexity: O(log n) - incredibly efficient
Space Complexity: O(1) for iterative, O(log n) for recursive

TEMPLATE 1 - BASIC BINARY SEARCH:
```python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2  # Avoid overflow
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
```

COMMON PITFALLS:

1. Overflow in mid calculation: Use `mid = left + (right - left) // 2` not `mid = (left + right) // 2`
2. Off-by-one errors: Should it be `left <= right` or `left < right`? Depends on variant!
3. Infinite loops: Ensure left/right pointers always make progress
4. Wrong boundary updates: Should it be `mid + 1` or `mid`?

TEMPLATE 2 - FINDING LEFTMOST INSERTION POINT:
```python
def binary_search_left(arr, target):
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right - left) // 2
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left
```

ADVANCED APPLICATIONS:

Binary search isn't just for finding elements in sorted arrays. It's a problem-solving pattern applicable to:
- Finding boundaries (first/last occurrence)
- Searching in rotated sorted arrays
- Finding peak elements
- Search in 2D matrices
- Minimizing/maximizing in optimization problems
- Finding square roots or other mathematical functions

PRO TIP: When you see "find minimum X such that condition is true" or "find maximum X such that condition
is true" on a monotonic function, think binary search on the answer!
"""

doc7 = """
GRAPH ALGORITHMS: BFS VS DFS - WHEN TO USE WHICH

Graph traversal is fundamental to solving many algorithmic problems. Understanding when to use Breadth-First
Search (BFS) versus Depth-First Search (DFS) is crucial for both interviews and real-world applications.

BREADTH-FIRST SEARCH (BFS):

BFS explores the graph level by level, visiting all neighbors before moving to the next level. It uses
a queue data structure and guarantees the shortest path in unweighted graphs.

Implementation Pattern:
```python
from collections import deque

def bfs(graph, start):
    visited = set([start])
    queue = deque([start])

    while queue:
        node = queue.popleft()
        # Process node here

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```

Time Complexity: O(V + E) where V is vertices and E is edges
Space Complexity: O(V) for the queue and visited set

When to use BFS:
- Finding shortest path in unweighted graphs
- Level-order traversal
- Finding all nodes within K distance
- Detecting cycles in undirected graphs
- Testing if graph is bipartite

DEPTH-FIRST SEARCH (DFS):

DFS explores as far as possible along each branch before backtracking. It uses a stack (or recursion)
and is excellent for exploring all possibilities.

Implementation Pattern (Recursive):
```python
def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()

    visited.add(node)
    # Process node here

    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)

    return visited
```

Time Complexity: O(V + E)
Space Complexity: O(V) for recursion stack and visited set

When to use DFS:
- Detecting cycles in directed graphs
- Topological sorting
- Finding connected components
- Path finding when all paths need exploration
- Solving puzzles/mazes
- Backtracking problems

THE KEY DIFFERENCE:

BFS guarantees shortest path and explores neighbors first. DFS goes deep and is better for exhaustive
search. In interview settings, if the problem mentions "shortest path" or "minimum steps", think BFS.
If it's about "find all paths" or "detect cycles", think DFS.
"""

doc8 = """
UNDERSTANDING BIG O NOTATION AND TIME COMPLEXITY ANALYSIS

Time complexity analysis is essential for writing efficient code and acing technical interviews. However,
many developers struggle with properly analyzing algorithmic complexity. Let's build a solid foundation.

WHAT IS BIG O?

Big O notation describes the upper bound of an algorithm's growth rate. It tells you how the runtime or
space requirements grow as the input size increases. We ignore constants and lower-order terms to focus
on the dominant factor.

COMMON COMPLEXITIES (from best to worst):

O(1) - Constant: Runtime doesn't depend on input size
Examples: Array access, hash map lookup (average case), arithmetic operations

O(log n) - Logarithmic: Runtime grows logarithmically
Examples: Binary search, balanced tree operations

O(n) - Linear: Runtime grows proportionally with input
Examples: Linear search, single loop through array

O(n log n) - Linearithmic: Common in efficient sorting
Examples: Merge sort, heap sort, quick sort (average case)

O(n²) - Quadratic: Nested loops over the data
Examples: Bubble sort, selection sort, naive string matching

O(2ⁿ) - Exponential: Runtime doubles with each additional element
Examples: Recursive fibonacci, subset generation

O(n!) - Factorial: Extremely slow, usually involves permutations
Examples: Traveling salesman brute force, generating all permutations

ANALYSIS TECHNIQUES:

1. Count the iterations:
   ```python
   for i in range(n):        # n iterations
       for j in range(n):    # n iterations each
           do_something()    # O(1)
   # Total: O(n²)
   ```

2. Identify the dominant term:
   If you have O(n + n log n + 10000), the answer is O(n log n)

3. Analyze recursive functions with recurrence relations:
   T(n) = T(n/2) + O(1) → O(log n)  # Binary search
   T(n) = 2T(n/2) + O(n) → O(n log n)  # Merge sort

COMMON MISTAKES:

- Confusing best/average/worst case complexity
- Forgetting to account for library function costs (sorting is O(n log n), not O(1)!)
- Assuming all hash operations are O(1) (worst case can be O(n))
- Not considering space complexity

SPACE COMPLEXITY:

Don't forget space complexity! It follows the same notation:
- Recursive call stack depth counts toward space
- Temporary arrays/structures count
- Input space typically doesn't count (depends on context)

PRACTICAL IMPLICATIONS:

For n = 1,000,000:
- O(log n): ~20 operations
- O(n): ~1,000,000 operations
- O(n log n): ~20,000,000 operations
- O(n²): ~1,000,000,000,000 operations (infeasible!)

Understanding these differences helps you choose the right algorithm and optimize when needed.
"""

doc9 = """
HASH TABLES: THE SECRET WEAPON FOR INTERVIEW PROBLEMS

Hash tables (dictionaries in Python, objects in JavaScript, maps in Java) are arguably the most useful
data structure for solving interview problems. Understanding when and how to use them can turn O(n²)
solutions into O(n) solutions.

WHAT IS A HASH TABLE?

A hash table stores key-value pairs and provides average O(1) time complexity for insertion, deletion,
and lookup. It works by using a hash function to compute an index where the value should be stored.

Average Case: O(1) for insert/delete/lookup
Worst Case: O(n) when many collisions occur (rare with good hash function)
Space Complexity: O(n)

COMMON INTERVIEW PATTERNS:

Pattern 1: Two Sum (Finding pairs):
```python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
```
Using a hash table converts O(n²) brute force to O(n)!

Pattern 2: Counting frequencies:
```python
from collections import Counter
def most_frequent(arr):
    counts = Counter(arr)
    return counts.most_common(1)[0][0]
```

Pattern 3: Detecting duplicates:
```python
def contains_duplicate(nums):
    seen = set()
    for num in nums:
        if num in seen:
            return True
        seen.add(num)
    return False
```

Pattern 4: Grouping/categorizing (anagrams, etc):
```python
from collections import defaultdict
def group_anagrams(words):
    groups = defaultdict(list)
    for word in words:
        key = ''.join(sorted(word))
        groups[key].append(word)
    return list(groups.values())
```

WHEN TO USE HASH TABLES:

- Need fast lookups by key
- Counting occurrences/frequencies
- Detecting duplicates
- Storing and retrieving pairs/relationships
- Caching/memoization
- Implementing sets

HASH TABLE VARIANTS:

1. Set: Hash table without values, just keys
2. Counter: Hash table optimized for counting
3. DefaultDict: Hash table with default values for missing keys
4. OrderedDict: Maintains insertion order (though regular dicts do this in Python 3.7+)

LIMITATIONS AND GOTCHAS:

- Keys must be hashable (immutable in Python: strings, numbers, tuples)
- Lists and dictionaries cannot be keys
- Iteration order used to be undefined (now preserved in modern Python)
- Memory overhead compared to arrays
- Not cache-friendly like arrays

PRO TIPS FOR INTERVIEWS:

- When you hear "in O(n) time", immediately think hash table
- Use hash tables to trade space for time
- Remember to check if key exists before accessing to avoid errors
- Consider using set() instead of dict when you only need to track existence
"""

doc10 = """
LINKED LISTS: MASTERING POINTER MANIPULATION

Linked lists are a fundamental data structure that tests your ability to manipulate pointers and think
about edge cases. They're frequently tested in interviews because they reveal how well you understand
memory and references.

SINGLY LINKED LIST BASICS:

Structure:
```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

Each node contains data and a pointer to the next node. The last node points to None.

Time Complexities:
- Access: O(n) - must traverse from head
- Search: O(n) - must traverse from head
- Insert at head: O(1)
- Insert at tail: O(n) without tail pointer, O(1) with tail pointer
- Delete: O(n) to find, then O(1) to delete

ESSENTIAL TECHNIQUES:

1. Two Pointer (Fast/Slow):
```python
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow  # slow is at middle when fast reaches end
```
Applications: Find middle, detect cycles, find kth from end

2. Dummy Head:
```python
def remove_elements(head, val):
    dummy = ListNode(0)
    dummy.next = head
    curr = dummy

    while curr.next:
        if curr.next.val == val:
            curr.next = curr.next.next
        else:
            curr = curr.next

    return dummy.next
```
Dummy nodes simplify edge cases when head might be deleted

3. Reversal:
```python
def reverse_list(head):
    prev = None
    curr = head

    while curr:
        next_temp = curr.next
        curr.next = prev
        prev = curr
        curr = next_temp

    return prev
```

COMMON PATTERNS:

- Reversal (iterative and recursive)
- Cycle detection (Floyd's algorithm)
- Finding middle element
- Merging sorted lists
- Removing elements
- Detecting palindromes

CRITICAL EDGE CASES:

Always test these:
- Empty list (head is None)
- Single node list
- List with two nodes
- Operation on head node
- Operation on tail node

DOUBLY LINKED LISTS:

Each node has both next and prev pointers. More memory but easier bidirectional traversal.

```python
class DLLNode:
    def __init__(self, val=0, next=None, prev=None):
        self.val = val
        self.next = next
        self.prev = prev
```

INTERVIEW TIPS:

- Draw pictures! Visualize pointer changes
- Handle None checks before accessing node.next
- Use dummy nodes to simplify head/tail operations
- Remember to return the new head if it changed
- Test with lists of length 0, 1, and 2
"""

doc11 = """
TREES: UNDERSTANDING TRAVERSALS AND COMMON PATTERNS

Tree problems are ubiquitous in interviews. Mastering tree traversals and recognizing common patterns
will help you solve a wide variety of problems efficiently.

TREE STRUCTURE:

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

TREE TRAVERSALS - THE FOUNDATION:

1. Inorder (Left, Root, Right):
```python
def inorder(root):
    if not root:
        return
    inorder(root.left)
    print(root.val)
    inorder(root.right)
```
Gives sorted order for BST!

2. Preorder (Root, Left, Right):
```python
def preorder(root):
    if not root:
        return
    print(root.val)
    preorder(root.left)
    preorder(root.right)
```
Useful for copying trees, prefix expressions

3. Postorder (Left, Right, Root):
```python
def postorder(root):
    if not root:
        return
    postorder(root.left)
    postorder(root.right)
    print(root.val)
```
Useful for deletion, postfix expressions

4. Level-order (BFS):
```python
from collections import deque
def levelorder(root):
    if not root:
        return
    queue = deque([root])
    while queue:
        node = queue.popleft()
        print(node.val)
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
```

COMMON TREE PATTERNS:

Pattern 1: Recursive Divide & Conquer
- Process left subtree
- Process right subtree
- Combine results
Example: Tree height, tree diameter, balanced tree check

Pattern 2: Path Problems
- Track path from root to current node
- Use backtracking
Example: Path sum, root to leaf paths

Pattern 3: Level-by-Level Processing
- Use BFS with queue
- Track level information
Example: Level order traversal, zigzag traversal, right side view

Pattern 4: Ancestor Problems
- Find LCA (Lowest Common Ancestor)
- Use parent pointers or path tracking

BINARY SEARCH TREES (BST):

Special property: For each node, all values in left subtree < node.val < all values in right subtree

This enables O(log n) operations:
- Search
- Insert
- Delete

Degrades to O(n) if tree becomes unbalanced (looks like linked list)

BST Validation:
```python
def is_valid_bst(root, min_val=float('-inf'), max_val=float('inf')):
    if not root:
        return True
    if not (min_val < root.val < max_val):
        return False
    return (is_valid_bst(root.left, min_val, root.val) and
            is_valid_bst(root.right, root.val, max_val))
```

PRO TIPS:

- Always check for None before accessing node properties
- For BST problems, leverage the sorted property
- Use helper functions with extra parameters for tracking state
- Level-order = BFS, other traversals = DFS
- Draw small examples to visualize the problem
"""

doc12 = """
BACKTRACKING: THE BRUTE FORCE THAT ACTUALLY WORKS

Backtracking is an algorithmic technique for finding all (or some) solutions to computational problems
by incrementally building candidates and abandoning candidates ("backtracking") when they fail to satisfy
the constraints.

WHEN TO USE BACKTRACKING:

Look for these keywords in problem descriptions:
- "Find all possible..."
- "Generate all..."
- "Enumerate all..."
- "Find all combinations/permutations..."
- Problems involving subsets, paths, or arrangements

THE BACKTRACKING TEMPLATE:

```python
def backtrack(candidate, constraints):
    if is_solution(candidate):
        output(candidate)
        return

    for next_choice in get_choices(candidate):
        if is_valid(next_choice, constraints):
            candidate.add(next_choice)
            backtrack(candidate, constraints)
            candidate.remove(next_choice)  # BACKTRACK!
```

The key insight: Try a choice, recurse, then undo the choice (backtrack) to try other options.

CLASSIC BACKTRACKING PROBLEMS:

1. Subsets (Power Set):
Generate all possible subsets of a set
Time: O(2ⁿ) - each element is either included or excluded

2. Permutations:
Generate all possible orderings
Time: O(n!) - n choices for first position, n-1 for second, etc.

3. Combinations:
Choose k elements from n elements
Time: O(C(n,k)) - binomial coefficient

4. N-Queens:
Place n queens on n×n chessboard so none attack each other
Time: O(n!) - classic backtracking problem

5. Sudoku Solver:
Fill in a Sudoku puzzle
Time: O(9^(empty cells)) - try 1-9 for each empty cell

OPTIMIZATION TECHNIQUES:

1. Pruning:
Eliminate branches early if they can't lead to valid solutions

2. Constraint Propagation:
After making a choice, immediately apply all constraints to reduce future choices

3. Ordering Heuristics:
Choose variables and values in a smart order (most constrained variable first)

EXAMPLE - GENERATE PARENTHESES:

```python
def generate_parentheses(n):
    result = []

    def backtrack(current, open_count, close_count):
        # Base case: valid combination complete
        if len(current) == 2 * n:
            result.append(current)
            return

        # Add opening parenthesis if we haven't used all
        if open_count < n:
            backtrack(current + '(', open_count + 1, close_count)

        # Add closing parenthesis if valid
        if close_count < open_count:
            backtrack(current + ')', open_count, close_count + 1)

    backtrack('', 0, 0)
    return result
```

TIME COMPLEXITY:

Backtracking problems often have exponential or factorial time complexity. That's okay! These problems
are inherently hard, and backtracking with pruning is often the best we can do.

INTERVIEW STRATEGY:

1. Identify it's a backtracking problem
2. Define your state/candidate representation
3. Identify base case (when is solution complete?)
4. Identify choices at each step
5. Identify constraints (when is a choice invalid?)
6. Implement with clear structure
7. Optimize with pruning if time permits
"""

TEST_CASES = [
    {
        "name": "Context Split Across Chunks",
        "query": "How do I skip duplicate elements in a two-pointer solution?",
        "relevant_doc_ids": [1],
        "expected_keywords": [
            "nums[left-1]", "skip", "while", "duplicate", "left < right",
            "sort", "two-pointer", "triplet", "three-sum", "optimization",
            "increment", "decrement", "sorted array", "O(n²)", "nums[i]",
            "valid triplet", "after finding"
        ],
        "description": "Tests if system can retrieve complete context when answer spans multiple chunks"
    },
    {
        "name": "Code Reference Resolution",
        "query": "Show me the helper function for palindrome checking",
        "relevant_doc_ids": [2],
        "expected_keywords": [
            "def is_palindrome", "return", "[::-1]", "clean", "isalnum",
            "lower", "helper function", "string", "reverse", "c.lower()",
            "clean ==", "O(n)", "case-insensitive", "alphanumeric", "join",
            "reusable", "utility", "edge cases", "slice notation"
        ],
        "description": "Tests if system retrieves code that references other code"
    },
    {
        "name": "Specific Detail Retrieval",
        "query": "What's the time complexity of the sliding window approach?",
        "relevant_doc_ids": [3],
        "expected_keywords": [
            "O(n)", "time", "complexity", "sliding window", "efficient",
            "window", "left pointer", "right pointer", "contiguous",
            "array", "string", "brute force", "technique", "pattern",
            "expand", "shrink", "dynamic", "subarray", "substring",
            "maximum sum", "optimization", "template"
        ],
        "description": "Tests if system finds specific technical details"
    },
    {
        "name": "Similar but Different",
        "query": "How is QuickSort different from MergeSort?",
        "relevant_doc_ids": [4],
        "expected_keywords": [
            "in-place", "divide", "pivot", "stable", "QuickSort", "MergeSort",
            "partition", "conquer", "space", "memory", "O(n log n)",
            "worst case", "average", "sorting", "comparison", "guarantee",
            "auxiliary", "recursive", "element", "preserve", "order"
        ],
        "description": "Tests if system can distinguish between similar concepts"
    },
    {
        "name": "Dynamic Programming Approach",
        "query": "What's the difference between memoization and tabulation?",
        "relevant_doc_ids": [5],
        "expected_keywords": [
            "top-down", "bottom-up", "recursion", "iteration", "memoization",
            "tabulation", "cache", "table", "DP", "dynamic programming",
            "subproblem", "recursive", "iterative", "base case", "memo",
            "array", "dictionary", "stack", "fibonacci", "optimal"
        ],
        "description": "Tests retrieval of comparison between two DP techniques"
    },
    {
        "name": "Implementation Pitfall",
        "query": "What's the overflow bug in binary search?",
        "relevant_doc_ids": [6],
        "expected_keywords": [
            "mid", "overflow", "left + (right - left)", "// 2", "binary search",
            "integer overflow", "midpoint", "(left + right)", "bug", "avoid",
            "large integers", "calculation", "index", "correct", "safer",
            "common mistake", "implementation", "pitfall", "prevention"
        ],
        "description": "Tests finding specific bug pattern in implementation"
    },
    {
        "name": "Algorithm Selection",
        "query": "When should I use BFS instead of DFS?",
        "relevant_doc_ids": [7],
        "expected_keywords": [
            "shortest path", "level", "queue", "unweighted", "BFS", "DFS",
            "breadth-first", "depth-first", "graph", "tree", "traversal",
            "FIFO", "distance", "layer", "neighbors", "search", "choice",
            "decision", "criteria", "when to use", "applications", "stack"
        ],
        "description": "Tests retrieval of decision criteria between algorithms"
    },
    {
        "name": "Complexity Classification",
        "query": "Which sorting algorithms have O(n log n) complexity?",
        "relevant_doc_ids": [8],
        "expected_keywords": [
            "merge sort", "heap sort", "quick sort", "average", "O(n log n)",
            "time complexity", "worst case", "best case", "Big O", "sorting",
            "algorithm", "comparison", "divide and conquer", "efficient",
            "logarithmic", "classification", "performance", "analysis"
        ],
        "description": "Tests finding algorithms by complexity class"
    },
    {
        "name": "Data Structure Pattern",
        "query": "How do I use a hash table to solve two sum?",
        "relevant_doc_ids": [9],
        "expected_keywords": [
            "complement", "seen", "target -", "O(1)", "hash table", "dictionary",
            "two sum", "lookup", "constant time", "pattern", "pair", "indices",
            "array", "nums[i]", "target - nums[i]", "hash map", "efficient",
            "solution", "store", "check", "linear", "O(n)"
        ],
        "description": "Tests retrieval of specific pattern implementation"
    },
    {
        "name": "Pointer Technique",
        "query": "How do you find the middle of a linked list with fast and slow pointers?",
        "relevant_doc_ids": [10],
        "expected_keywords": [
            "slow", "fast", "fast.next.next", "slow.next", "linked list",
            "two pointers", "middle", "node", "tortoise", "hare", "pointer",
            "technique", "Floyd", "cycle", "advance", "move", "traverse",
            "head", "while", "null", "algorithm", "pattern"
        ],
        "description": "Tests retrieval of two-pointer technique"
    },
    {
        "name": "Tree Traversal Type",
        "query": "What traversal gives me nodes in sorted order for a BST?",
        "relevant_doc_ids": [11],
        "expected_keywords": [
            "inorder", "left", "root", "right", "sorted", "BST",
            "binary search tree", "traversal", "order", "ascending",
            "property", "recursive", "visit", "node", "LNR", "in-order",
            "tree", "structure", "algorithm", "sequence", "elements"
        ],
        "description": "Tests knowledge retrieval about BST properties"
    },
    {
        "name": "Problem-Solving Template",
        "query": "What's the backtracking template for generating combinations?",
        "relevant_doc_ids": [12],
        "expected_keywords": [
            "is_solution", "candidate", "backtrack", "remove", "template",
            "recursive", "combinations", "base case", "choice", "constraint",
            "prune", "state", "undo", "explore", "backtracking", "pattern",
            "structure", "function", "result", "append", "pop", "generate",
            "valid"
        ],
        "description": "Tests retrieval of algorithmic template/pattern"
    },
]
