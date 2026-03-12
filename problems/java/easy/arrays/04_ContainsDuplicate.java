import java.util.HashSet;

public class ContainsDuplicate {
    public static boolean containsDuplicate(int[] arr) {
        if (arr == null) return false;
        HashSet<Integer> s = new HashSet<>();
        for (int v : arr) {
            if (!s.add(v)) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        int[] a = {1,2,3,1};
        System.out.println(containsDuplicate(a));
    }
}
