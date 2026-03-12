public class ReverseArray {
    public static void reverse(int[] arr) {
        if (arr == null) return;
        int i = 0, j = arr.length - 1;
        while (i < j) {
            int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            i++; j--;
        }
    }

    public static void main(String[] args) {
        int[] a = {1,2,3};
        reverse(a);
        for (int v : a) System.out.print(v + " ");
    }
}
