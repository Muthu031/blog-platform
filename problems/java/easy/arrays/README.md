Arrays - Easy

Problems included:
1. Max Element
2. Reverse Array
3. Rotate Array by K
4. Contains Duplicate
5. Move Zeros to End

Each problem has a description file and a starter Java file.

How to run
--------

Compile a single file:

```
javac 01_MaxElement.java
java MaxElement
```

Compile all files in this folder:

```
javac *.java
```

Run a class (use the class name without `.java`):

```
java MaxElement
java ReverseArray
java RotateArray
java ContainsDuplicate
java MoveZeros
```

Notes:

- From the repository root, change directory to this folder first:

```
cd problems/java/easy/arrays
```
- On Windows ensure `javac`/`java` are on your `PATH` (JDK installed).
- To compile and run in one line (example):

```
javac 02_ReverseArray.java && java ReverseArray
```

example:
cd problems/java/easy/arrays; javac 05_MoveZeros.java; if ($LASTEXITCODE -eq 0) { java MoveZeros }