public class RotateArray {
    public static void rotate(int[] arr, int k) {
        if (arr == null || arr.length == 0) return;
        int n = arr.length;
        k = ((k % n) + n) % n;
        reverseRange(arr, 0, n-1);
        reverseRange(arr, 0, k-1);
        reverseRange(arr, k, n-1);
    }

    private static void reverseRange(int[] a, int i, int j) {
        while (i < j) {
            int t = a[i]; a[i] = a[j]; a[j] = t; i++; j--;
        }
    }

    public static void main(String[] args) {
        int[] a = {1,2,3,4,5};
        rotate(a, 2);
        for (int v : a) System.out.print(v + " ");
    }
}
