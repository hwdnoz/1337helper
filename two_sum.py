""" Two sum problem solution """

def two_sum(nums, target):
    """Find two numbers that add up to given target"""

    diffs = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in diffs:
            return [diffs[diff], i]
        diffs[num] = i

    return []


if __name__ == "__main__":
    addends = two_sum([2, 7, 11, 15], 9)
    print(addends)
