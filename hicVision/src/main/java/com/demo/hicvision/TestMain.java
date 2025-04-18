package com.demo.hicvision;

/**
 * @version 1.0
 * @Author Imak
 * @Date 2025/4/18 10:14
 * @注释
 */
public class TestMain {
    public static void main(String[] args) {
        PlateRecognition plateRecognition = new PlateRecognition();
        plateRecognition.getPlateNo("192.168.2.3","admin","aq12345678", (short) 8000);
    }
}
