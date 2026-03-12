public class MoveZeros {
    public static void moveZeros(int[] arr) {
        if (arr == null) return;
        int j = 0;
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] != 0) arr[j++] = arr[i];
        }
        while (j < arr.length) arr[j++] = 0;
    }

    public static void main(String[] args) {
        int[] a = {0,1,0,3,12};
        moveZeros(a);
        for (int v : a) System.out.print(v + " ");
    }
}
