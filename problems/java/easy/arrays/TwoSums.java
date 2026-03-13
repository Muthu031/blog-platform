class TwoSums {

    public static int[] twoSum(int[] nums, int target) {

        // Time Complexity: O(1)
        // Space Complexity: O(1)
        // This check runs once and does not depend on input size
        if (nums == null || nums.length < 2) {
            return new int[0]; // return empty array if input is invalid
        }

        // Outer loop iterates through each element in the array
        // Time Complexity: O(n)
        for (int i = 0; i < nums.length; i++) {

            // Inner loop checks every element after index i
            // Time Complexity: O(n)
            // Because of nested loops, total complexity becomes O(n²)
            for (int j = i + 1; j < nums.length; j++) {

                // Checking the sum takes constant time
                // Time Complexity: O(1)
                if (nums[i] + nums[j] == target) {

                    // Creating and returning the result array
                    // Time Complexity: O(1)
                    // Space Complexity: O(1) (fixed size array of length 2)
                    return new int[]{i, j};
                }
            }
        }

        // If no pair is found return empty array
        // Time Complexity: O(1)
        // Space Complexity: O(1)
        return new int[0];
    }

    public static void main(String[] args) {

        // Time Complexity: O(1)
        // Creating input array
        int[] nums = {2, 7, 11, 15};

        // Time Complexity: O(1)
        int target = 9;

        // Calling the function
        // Overall Time Complexity of twoSum(): O(n²)
        int[] result = twoSum(nums, target);

        // Loop to print the result
        // Time Complexity: O(k) where k is result size (max 2)
        for (int v : result) {
            System.out.print(v + " ");
        }
    }
}

// cd programs/java/easy/arrays
// javac TwoSums.java
// javac TwoSums.java; if ($LASTEXITCODE -eq 0) { java TwoSums }