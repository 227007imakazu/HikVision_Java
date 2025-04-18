//package com.ningroad.hikvision;
//
//import com.ningroad.hikvision.NetSDKDemo.HCNetSDK;
//import com.sun.jna.Pointer;
//import org.apache.commons.codec.DecoderException;
//import org.apache.commons.codec.binary.Hex;
//
//import java.io.*;
//import java.net.Socket;
//import java.nio.charset.Charset;
//
//public class PlateRecognition {
//
//    private static int lUserID = -1; // 登录设备后返回的用户ID
//    private static Socket socket;     // 用于控制线圈的Socket连接
//
//    public static void main(String[] args) {
//        // 1. 初始化 SDK
//        if (!HCNetSDK.INSTANCE.NET_DVR_Init()) {
//            System.out.println("SDK 初始化失败，错误码: " + HCNetSDK.INSTANCE.NET_DVR_GetLastError());
//            return;
//        }
//        System.out.println("SDK 初始化成功");
//
//        // 2. 配置并登录设备
//        HCNetSDK.NET_DVR_USER_LOGIN_INFO loginInfo = new HCNetSDK.NET_DVR_USER_LOGIN_INFO();
//        loginInfo.bUseAsynLogin = 0;
//        System.arraycopy("192.168.2.3".getBytes(), 0, loginInfo.sDeviceAddress, 0, "192.168.2.3".length());
//        System.arraycopy("admin".getBytes(), 0, loginInfo.sUserName, 0, "admin".length());
//        System.arraycopy("aq12345678".getBytes(), 0, loginInfo.sPassword, 0, "aq12345678".length());
//        loginInfo.wPort = (short) 8000;
//
//        HCNetSDK.NET_DVR_DEVICEINFO_V40 devInfo = new HCNetSDK.NET_DVR_DEVICEINFO_V40();
//        lUserID = HCNetSDK.INSTANCE.NET_DVR_Login_V40(loginInfo, devInfo);
//        if (lUserID < 0) {
//            System.out.println("登录失败，错误码: " + HCNetSDK.INSTANCE.NET_DVR_GetLastError());
//            HCNetSDK.INSTANCE.NET_DVR_Cleanup();
//            return;
//        }
//        System.out.println("设备登录成功");
//
//        try {
//            // 打开线圈
//            sendCoilCommand("11 05 00 00 FF 00 8E AA");
//            System.out.println("📤 线圈已打开，等待抓拍...");
//            Thread.sleep(1000); // 等待线圈状态稳定
//
//            // 手动抓拍
//            HCNetSDK.NET_DVR_MANUALSNAP snapCfg = new HCNetSDK.NET_DVR_MANUALSNAP();
//            snapCfg.dwSize = snapCfg.size();
//            snapCfg.bySnapTimes = 1;
//            snapCfg.byTriggerMode = 1;
//            snapCfg.byJointSnap = 0;
//
//            HCNetSDK.NET_DVR_PLATE_RESULT plateResult = new HCNetSDK.NET_DVR_PLATE_RESULT();
//            boolean triggered = HCNetSDK.INSTANCE.NET_DVR_ManualSnap(lUserID, snapCfg, plateResult);
//
//            if (triggered) {
//                String license = new String(plateResult.struPlateInfo.sLicense, Charset.forName("GBK")).trim();
//                System.out.println("🚗 识别到车牌号：" + license);
//            } else {
//                System.out.println("❌ 手动抓拍失败，错误码: " + HCNetSDK.INSTANCE.NET_DVR_GetLastError());
//            }
//
//            // 延迟3秒后关闭线圈
//            Thread.sleep(3000);
//            sendCoilCommand("11 05 00 00 00 00 CF 5A");
//            System.out.println("✅ 线圈已关闭");
//        } catch (Exception e) {
//            e.printStackTrace();
//        } finally {
//            HCNetSDK.INSTANCE.NET_DVR_Logout(lUserID);
//            HCNetSDK.INSTANCE.NET_DVR_Cleanup();
//            System.out.println("已清理资源");
//        }
//    }
//
//    // 📤 向 USR-IO 控制器发送十六进制字符串命令（控制 DO）
//    public static void sendCoilCommand(String hexStr) throws IOException, DecoderException {
//        if (socket == null || socket.isClosed()) {
//            socket = new Socket("192.168.0.7", 20108);
//            socket.setSoTimeout(1000); // 设置读取超时，防止阻塞
//        }
//        OutputStream os = socket.getOutputStream();
//        byte[] data = Hex.decodeHex(hexStr.replace(" ", "").toCharArray());
//        os.write(data);
//        os.flush();
//        System.out.println("📤 已发送线圈指令: " + hexStr);
//    }
//}


package com.demo.hicvision;


import com.demo.hicvision.NetSDKDemo.HCNetSDK;
import com.sun.jna.Pointer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.Charset;

/**
 * 拍摄车牌号
 */
@Component
public class PlateRecognition {

    private static Logger logger = LoggerFactory.getLogger(PlateRecognition.class);

    private static int lUserID = -1;

    public String getPlateNo(String ipAddress,String account,String password,short port){
        String license= null;
        try {
            // 1. 初始化 SDK
            boolean initSuc = HCNetSDK.INSTANCE.NET_DVR_Init();
            license = "";
            if (!initSuc) {
                logger.error("SDK 初始化失败，错误码: " + HCNetSDK.INSTANCE.NET_DVR_GetLastError());
                return license;
            }
            logger.info("SDK 初始化成功");

            // 2. 登录设备
            HCNetSDK.NET_DVR_USER_LOGIN_INFO loginInfo = new HCNetSDK.NET_DVR_USER_LOGIN_INFO();
            loginInfo.bUseAsynLogin = 0;
            System.arraycopy(ipAddress.getBytes(), 0, loginInfo.sDeviceAddress, 0, ipAddress.length());
            System.arraycopy(account.getBytes(), 0, loginInfo.sUserName, 0, account.length());
            System.arraycopy(password.getBytes(), 0, loginInfo.sPassword, 0, password.length());
            loginInfo.wPort = port;

            HCNetSDK.NET_DVR_DEVICEINFO_V40 devInfo = new HCNetSDK.NET_DVR_DEVICEINFO_V40();
            lUserID = HCNetSDK.INSTANCE.NET_DVR_Login_V40(loginInfo, devInfo);
            if (lUserID < 0) {
                logger.error("登录失败，错误码: " + HCNetSDK.INSTANCE.NET_DVR_GetLastError());
                HCNetSDK.INSTANCE.NET_DVR_Cleanup();
                return license;
            }
            logger.info("设备登录成功");

            // 3. 设置回调函数
            PlateRecognitionCallback callback = new PlateRecognitionCallback();
            HCNetSDK.INSTANCE.NET_DVR_SetDVRMessageCallBack_V50(0, callback, null);

            // 4. 启动布防（开启事件检测）

            HCNetSDK.NET_DVR_SETUPALARM_PARAM alarmParam = new HCNetSDK.NET_DVR_SETUPALARM_PARAM();
            alarmParam.dwSize = alarmParam.size();
            int alarmHandle = HCNetSDK.INSTANCE.NET_DVR_SetupAlarmChan_V41(lUserID, alarmParam);
            if (alarmHandle < 0) {
                logger.error("布防失败，错误码: " + HCNetSDK.INSTANCE.NET_DVR_GetLastError());
            } else {
                logger.info("布防成功，开始抓拍...");

                // 手动抓拍（使用三参数接口）
                HCNetSDK.NET_DVR_MANUALSNAP snapCfg = new HCNetSDK.NET_DVR_MANUALSNAP();
                snapCfg.dwSize = snapCfg.size();
                snapCfg.bySnapTimes = 1;
                snapCfg.byTriggerMode = 1;
                snapCfg.byJointSnap = 0;

                HCNetSDK.NET_DVR_PLATE_RESULT plateResult = new HCNetSDK.NET_DVR_PLATE_RESULT();

                boolean triggered = HCNetSDK.INSTANCE.NET_DVR_ManualSnap(lUserID, snapCfg, plateResult);

                if (triggered) {
                    license = new String(plateResult.struPlateInfo.sLicense, Charset.forName("GBK")).trim();
                    logger.info("🚗 识别到车牌号：" + license);
                }
                else {
                    logger.error("❌ 手动抓拍失败，错误码: " + HCNetSDK.INSTANCE.NET_DVR_GetLastError());
                }
            }
        } catch (Exception e) {
            logger.error("❌ 识别到车牌号失败: " +e.getMessage());
        }

        // 5. 等待回调识别（可选）
        try {
            Thread.sleep(10000); // 等待识别结果回调（仅回调模式有效）
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        // 6. 清理资源
        HCNetSDK.INSTANCE.NET_DVR_Logout(lUserID);
        HCNetSDK.INSTANCE.NET_DVR_Cleanup();
        logger.info("已清理资源");
        return license;
    }

    public static void main(String[] args) {
//        getPlateNo("192.168.2.3","admin","aq12345678",(short)8000);
    }

    public static class PlateRecognitionCallback implements HCNetSDK.FMSGCallBack_V31 {
        @Override
        public void invoke(int lCommand, HCNetSDK.NET_DVR_ALARMER pAlarmer, Pointer pAlarmInfo, int dwBufLen, Pointer pUser) {
            logger.info("📥 接收到报警指令 lCommand = " + lCommand);
            if (lCommand == HCNetSDK.COMM_ITS_PLATE_RESULT) {
                HCNetSDK.NET_ITS_PLATE_RESULT result = new HCNetSDK.NET_ITS_PLATE_RESULT();
                result.write();
                result.getPointer().write(0, pAlarmInfo.getByteArray(0, result.size()), 0, result.size());
                result.read();

                String license = new String(result.struPlateInfo.sLicense).trim();
                logger.info("🚗 回调识别到车牌号：" + license);

                for (int i = 0; i < result.dwPicNum; i++) {
                    HCNetSDK.NET_ITS_PICTURE_INFO picInfo = result.struPicInfo[i];
                    if (picInfo.dwDataLen > 0) {
                        try (FileOutputStream fos = new FileOutputStream("plate_pic_" + System.currentTimeMillis() + ".jpg")) {
                            fos.write(picInfo.pBuffer.getByteArray(0, picInfo.dwDataLen));
                            logger.info("📸 图片保存成功");
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        }
    }
}
