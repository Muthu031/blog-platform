public class MaxElement {
    public static int maxElement(int[] arr) {
        if (arr == null || arr.length == 0) return Integer.MIN_VALUE;
        int max = arr[0];
        for (int v : arr) if (v > max) max = v;
        return max;
    }

    public static void main(String[] args) {
        int[] a = {1, 3, 2};
        System.out.println(maxElement(a));
    }
}
