// 初始化插件

// 全局保存当前选中窗口
var g_iWndIndex = 0; //可以不用设置这个变量，有窗口参数的接口中，不用传值，开发包会默认使用当前选择窗口
var g_oLocalConfig = null; //本地配置

//错误码
//通用错误
var ERROR_CODE_UNKNOWN = 1000; //未知错误
var ERROR_CODE_NETWORKERROR = 1001; //网络错误
var ERROR_CODE_PARAMERROR = 1002; //缺少插件元素

//登录模块
var ERROR_CODE_LOGIN_NOLOGIN = 2000; // 未登录
var ERROR_CODE_LOGIN_REPEATLOGIN = 2001; //设备已登录，重复登录
var ERROR_CODE_LOGIN_NOSUPPORT = 2002; //当前设备不支持Digest登录

//预览播放
var ERROR_CODE_PLAY_PLUGININITFAIL = 3000; //插件初始化失败
var ERROR_CODE_PLAY_NOREPEATPLAY = 3001; //当前窗口已经在预览
var ERROR_CODE_PLAY_PLAYBACKABNORMAL = 3002; //回放异常
var ERROR_CODE_PLAY_PLAYBACKSTOP = 3003; //回放停止
var ERROR_CODE_PLAY_NOFREESPACE = 3004; //录像过程中，硬盘容量不足

//对讲
var ERROR_CODE_TALK_FAIL = 5000; //语音对讲失败


var version="V3.3.0build20230322"
const cameras = [
    { ip: '192.168.2.2', port: 80, user: 'admin', pwd: 'ningroad2025', channel: 1 },
    // { ip: '192.168.2.3', port: 80, user: 'admin', pwd: 'aq12345678', channel: 1 },
    // { ip: '192.168.2.4', port: 80, user: 'admin', pwd: 'pass3', channel: 1 },
    // { ip: '192.168.2.5', port: 80, user: 'admin', pwd: 'pass4', channel: 1 }
];
const g_recordHandles = new Map(); // 使用Map结构 key:窗口索引 value:句柄
$(function () {


    // 初始化插件参数及插入插件
    WebVideoCtrl.I_InitPlugin({
        bWndFull: true,     //是否支持单窗口双击全屏，默认支持 true:支持 false:不支持
        iWndowType: 1,
        //aIframe: ["test"],
        cbSelWnd: function (xmlDoc) {
            g_iWndIndex = parseInt($(xmlDoc).find("SelectWnd").eq(0).text(), 10);
            var szInfo = "当前选择的窗口编号：" + g_iWndIndex;
            showCBInfo(szInfo);
        },
        cbDoubleClickWnd: function (iWndIndex, bFullScreen) {
            var szInfo = "当前放大的窗口编号：" + iWndIndex;
            if (!bFullScreen) {
                szInfo = "当前还原的窗口编号：" + iWndIndex;
            }
            showCBInfo(szInfo);
        },
        cbEvent: function (iEventType, iParam1, iParam2) {
            if (2 == iEventType) {// 回放正常结束
                showCBInfo("窗口" + iParam1 + "回放结束！");
            } else if (-1 == iEventType) {
                showCBInfo("设备" + iParam1 + "网络错误！");
            } else if (3001 == iEventType) {
                clickStopRecord(g_szRecordType, iParam1);
            }
        },
        cbInitPluginComplete: function () {
            WebVideoCtrl.I_InsertOBJECTPlugin("divPlugin").then(() => {
                // 检查插件是否最新
                WebVideoCtrl.I_CheckPluginVersion().then((bFlag) => {
                    if (bFlag) {
                        alert("检测到新的插件版本，双击开发包目录里的HCWebSDKPlugin.exe升级！");
                    }
                });
            }, () => {
                alert("插件初始化失败，请确认是否已安装插件；如果未安装，请双击开发包目录里的HCWebSDKPlugin.exe安装！");
            });
        },
        cbInitPluginComplete: function () {
            WebVideoCtrl.I_InsertOBJECTPlugin("divPlugin").then(() => {
                // 检查插件版本后自动登录
                for (let i = 0; i < cameras.length; i++) {
                    autoLogin(cameras[i].ip, cameras[i].port, cameras[i].user, cameras[i].pwd, i);
                }
                // //登录后进行录制
                // setTimeout(() => {
                //     recordVideo(2000);//录制时长2s
                // },1000)
            });
        }

    });

    // 窗口事件绑定
    $(window).bind({
        resize: function () {
            //WebVideoCtrl.I_Resize($("body").width(), $("body").height());
        }
    });




    //初始化日期时间
    var szCurTime = dateFormat(new Date(), "yyyy-MM-dd");
    $("#starttime").val(szCurTime + " 00:00:00");
    $("#endtime").val(szCurTime + " 23:59:59");
    $("#downloadstarttime").val(szCurTime + " 00:00:00");
    $("#downloadendtime").val(szCurTime + " 23:59:59");
});
function autoLogin(szIP, szPort, szUsername, szPassword,index){
    //TODO 后面要确认摄像头信息从哪里获取
    // 使用配置自动登录
    var szDeviceIdentify = szIP + "_" + szPort;
    WebVideoCtrl.I_Login(
        szIP,
        1, // 端口类型
        szPort,
        szUsername,
        szPassword,
        {
            success: (xmlDoc) => {
                showOPInfo(szDeviceIdentify + " 登录成功！");
                // 获取通道信息
                getChannelInfo();
                getDevicePort();
                //开启预览
                setTimeout(() => {
                    startPreview(szDeviceIdentify,1,index);
                },100)

            },
            error: (oError) => {
                showOPInfo(szDeviceIdentify + " 登录失败！", oError.errorCode, oError.errorMsg);
                alert("自动连接监控失败，请手动登录！");
            }
        }
    );
}



// 新增启动预览函数
function startPreview(deviceIdentify, channel, wndIndex) {
    WebVideoCtrl.I_StartRealPlay(deviceIdentify, {
        iWndIndex: wndIndex, // 指定窗口索引
        iStreamType: 1, // 主码流
        iChannelID: channel,
        bZeroChannel: false,
        success: () => {
            showOPInfo(`${deviceIdentify} 窗口${wndIndex}开始预览`);
        },
        error: (oError) => {
            showOPInfo(`${deviceIdentify} 预览失败`, oError.errorCode, oError.errorMsg);
        }
    });
}




function recordVideo(duration=180000){
    startRecordingForAllWindows('realplay');
    setTimeout(function(){
        stopRecordingForAllWindows('realplay');
    }, duration); // 精确停止
}

function startRecordingForAllWindows() {
    // 清空旧句柄
    g_recordHandles.clear();

    // 遍历所有摄像头对应的窗口
    cameras.forEach((camera, wndIndex) => {
        const deviceId = `${camera.ip}_${camera.port}`;
        const filename = `${deviceId}_${new Date().getTime()}.mp4`;

        // 核心参数：指定窗口索引
        WebVideoCtrl.I_StartRecord(filename, {
            iWndIndex: wndIndex, // 关键参数！指定录像窗口
            iStreamType: 1,       // 主码流
            bAudio: true,         // 是否录制音频
            success: (handle) => {
                g_recordHandles.set(wndIndex, handle);
                showOPInfo(`窗口${wndIndex} 录像启动成功`);
            },
            error: (err) => {
                showOPInfo(`窗口${wndIndex} 录像失败`, err.errorCode, err.errorMsg);
            }
        });
    });
}

function stopRecordingForAllWindows() {
    g_recordHandles.forEach((handle, wndIndex) => {
        WebVideoCtrl.I_StopRecord({
            iHandle: handle,  // 使用保存的句柄
            iWndIndex: wndIndex, // 双重保障
            success: () => {
                showOPInfo(`窗口${wndIndex} 录像已停止`);
                g_recordHandles.delete(wndIndex);
            },
            error: (err) => {
                showOPInfo(`窗口${wndIndex} 停止失败`, err.errorCode, err.errorMsg);
            }
        });
    });
}


// 显示操作信息
function showOPInfo(szInfo, status, xmlDoc) {
    var szTip = "<div>" + dateFormat(new Date(), "yyyy-MM-dd hh:mm:ss") + " " + szInfo;
    if (typeof status != "undefined" && status != 200) {
        var szStatusString = $(xmlDoc).find("statusString").eq(0).text();
        var szSubStatusCode = $(xmlDoc).find("subStatusCode").eq(0).text();
        if ("" === szSubStatusCode) {
            if("" === szSubStatusCode && "" === szStatusString){
                szTip += "(" + status + ")";
            }
            else{
                szTip += "(" + status + ", " + szStatusString + ")";
            }
        } else {
            szTip += "(" + status + ", " + szSubStatusCode + ")";
        }
    }
    szTip += "</div>";

    $("#opinfo").html(szTip + $("#opinfo").html());
}

// 显示回调信息
function showCBInfo(szInfo) {
    szInfo = "<div>" + dateFormat(new Date(), "yyyy-MM-dd hh:mm:ss") + " " + szInfo + "</div>";
    $("#cbinfo").html(szInfo + $("#cbinfo").html());
}

// 格式化时间
function dateFormat(oDate, fmt) {
    var o = {
        "M+": oDate.getMonth() + 1, //月份
        "d+": oDate.getDate(), //日
        "h+": oDate.getHours(), //小时
        "m+": oDate.getMinutes(), //分
        "s+": oDate.getSeconds(), //秒
        "q+": Math.floor((oDate.getMonth() + 3) / 3), //季度
        "S": oDate.getMilliseconds()//毫秒
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (oDate.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}

// 获取窗口尺寸
function getWindowSize() {
    var nWidth = $(this).width() + $(this).scrollLeft(),
        nHeight = $(this).height() + $(this).scrollTop();

    return {width: nWidth, height: nHeight};
}

// 打开选择框 0：文件夹  1：文件
function clickOpenFileDlg(id, iType) {
    WebVideoCtrl.I_OpenFileDlg(iType).then(function(szDirPath){
        if (szDirPath != -1 && szDirPath != "" && szDirPath != null) {
            $("#" + id).val(szDirPath);
        }
    }, function() {
        showOPInfo("打开文件路径失败");
    });
}

// 获取本地参数
function clickGetLocalCfg() {
    WebVideoCtrl.I_GetLocalCfg().then((oLocalConfig) => {
        g_oLocalConfig = oLocalConfig;
        $("#netsPreach").val(oLocalConfig.buffNumberType);
        $("#wndSize").val(oLocalConfig.playWndType);
        $("#rulesInfo").val(oLocalConfig.ivsMode);
        $("#captureFileFormat").val(oLocalConfig.captureFileFormat);
        $("#packSize").val(oLocalConfig.packgeSize);
        $("#recordPath").val(oLocalConfig.recordPath);
        $("#downloadPath").val(oLocalConfig.downloadPath);
        $("#previewPicPath").val(oLocalConfig.capturePath);
        $("#playbackPicPath").val(oLocalConfig.playbackPicPath);
        $("#devicePicPath").val(oLocalConfig.deviceCapturePath);
        $("#playbackFilePath").val(oLocalConfig.playbackFilePath);
        $("#protocolType").val(oLocalConfig.protocolType);
        $("#secretKey").val("\x7F\x7F\x7F\x7F\x7F\x7F\x7F\x7F");
        showOPInfo("本地配置获取成功！");
    }, (oError) => {
        var szInfo = "本地配置获取失败！";
        showOPInfo(szInfo, oError.errorCode, oError.errorMsg);
    });
}

// 设置本地参数
async function clickSetLocalCfg() {
    g_oLocalConfig.buffNumberType = $("#netsPreach").val();
    g_oLocalConfig.playWndType = $("#wndSize").val();
    g_oLocalConfig.ivsMode = $("#rulesInfo").val();
    g_oLocalConfig.captureFileFormat = $("#captureFileFormat").val();
    g_oLocalConfig.packgeSize = $("#packSize").val();
    g_oLocalConfig.recordPath = $("#recordPath").val();
    g_oLocalConfig.downloadPath = $("#downloadPath").val();
    g_oLocalConfig.capturePath = $("#previewPicPath").val();
    g_oLocalConfig.playbackPicPath = $("#playbackPicPath").val();
    g_oLocalConfig.deviceCapturePath = $("#devicePicPath").val();
    g_oLocalConfig.playbackFilePath = $("#playbackFilePath").val();
    g_oLocalConfig.protocolType = $("#protocolType").val();
    if ("\x7F\x7F\x7F\x7F\x7F\x7F\x7F\x7F" !== $("#secretKey").val()) {
        g_oLocalConfig.secretKey = await WebVideoCtrl.I_GetEncryptString($("#secretKey").val());
    }
    WebVideoCtrl.I_SetLocalCfg(g_oLocalConfig).then(() => {
        showOPInfo("本地配置设置成功！");
    }, (oError) => {
        var szInfo = "本地配置设置失败！";
        showOPInfo(szInfo, oError.errorCode, oError.errorMsg);
    });
}

// 窗口分割数
function changeWndNum(iType) {
    if ("1*2" === iType || "2*1" === iType) {
        WebVideoCtrl.I_ArrangeWindow(iType).then(() => {
            showOPInfo("窗口分割成功！");
        }, (oError) => {
            var szInfo = "窗口分割失败！";
            showOPInfo(szInfo, oError.errorCode, oError.errorMsg);
        });
    } else {
        iType = parseInt(iType, 10);
        WebVideoCtrl.I_ChangeWndNum(iType).then(() => {
            showOPInfo("窗口分割成功！");
        }, (oError) => {
            var szInfo = "窗口分割失败！";
            showOPInfo(szInfo, oError.errorCode, oError.errorMsg);
        });
    }
}

// 登录
function clickLogin() {
    var szIP = $("#loginip").val(),
        szPort = $("#port").val(),
        szUsername = $("#username").val(),
        szPassword = $("#password").val();

    if ("" == szIP || "" == szPort) {
        return;
    }

    var szDeviceIdentify = szIP + "_" + szPort;

    WebVideoCtrl.I_Login(szIP, 1, szPort, szUsername, szPassword, {
        timeout: 3000,
        success: function (xmlDoc) {
            showOPInfo(szDeviceIdentify + " 登录成功！");
            $("#ip").prepend("<option value='" + szDeviceIdentify + "'>" + szDeviceIdentify + "</option>");
            setTimeout(function () {
                $("#ip").val(szDeviceIdentify);
                setTimeout(function() {
                    getChannelInfo();
                }, 1000);
                getDevicePort();
            }, 10);
        },
        error: function (oError) {
            if (ERROR_CODE_LOGIN_REPEATLOGIN === status) {
                showOPInfo(szDeviceIdentify + " 已登录过！");
            } else {
                showOPInfo(szDeviceIdentify + " 登录失败！", oError.errorCode, oError.errorMsg);
            }
        }
    });
}

// 退出
function clickLogout() {
    var szDeviceIdentify = $("#ip").val();

    if (null == szDeviceIdentify) {
        return;
    }

    WebVideoCtrl.I_Logout(szDeviceIdentify).then(() => {
        showOPInfo(szDeviceIdentify + " " + "退出成功！");
    }, () => {
        showOPInfo(szDeviceIdentify + " " + "退出失败！");
    });
}

// 获取设备信息
function clickGetDeviceInfo() {
    var szDeviceIdentify = $("#ip").val();

    if (null == szDeviceIdentify) {
        return;
    }

    WebVideoCtrl.I_GetDeviceInfo(szDeviceIdentify, {
        success: function (xmlDoc) {
            var arrStr = [];
            arrStr.push("设备名称：" + $(xmlDoc).find("deviceName").eq(0).text() + "\r\n");
            arrStr.push("设备ID：" + $(xmlDoc).find("deviceID").eq(0).text() + "\r\n");
            arrStr.push("型号：" + $(xmlDoc).find("model").eq(0).text() + "\r\n");
            arrStr.push("设备序列号：" + $(xmlDoc).find("serialNumber").eq(0).text() + "\r\n");
            arrStr.push("MAC地址：" + $(xmlDoc).find("macAddress").eq(0).text() + "\r\n");
            arrStr.push("主控版本：" + $(xmlDoc).find("firmwareVersion").eq(0).text() + " " + $(xmlDoc).find("firmwareReleasedDate").eq(0).text() + "\r\n");
            arrStr.push("编码版本：" + $(xmlDoc).find("encoderVersion").eq(0).text() + " " + $(xmlDoc).find("encoderReleasedDate").eq(0).text() + "\r\n");

            showOPInfo(szDeviceIdentify + " 获取设备信息成功！");
            alert(arrStr.join(""));
        },
        error: function (oError) {
            showOPInfo(szDeviceIdentify + " 获取设备信息失败！", oError.errorCode, oError.errorMsg);
        }
    });
}

// 获取通道
function getChannelInfo() {
    var szDeviceIdentify = $("#ip").val(),
        oSel = $("#channels").empty();

    if (null == szDeviceIdentify) {
        return;
    }

    // 模拟通道
    WebVideoCtrl.I_GetAnalogChannelInfo(szDeviceIdentify, {
        success: function (xmlDoc) {
            var oChannels = $(xmlDoc).find("VideoInputChannel");

            $.each(oChannels, function (i) {
                var id = $(this).find("id").eq(0).text(),
                    name = $(this).find("name").eq(0).text();
                if ("" == name) {
                    name = "Camera " + (i < 9 ? "0" + (i + 1) : (i + 1));
                }
                oSel.append("<option value='" + id + "' bZero='false'>" + name + "</option>");
            });
            showOPInfo(szDeviceIdentify + " 获取模拟通道成功！");
        },
        error: function (oError) {
            showOPInfo(szDeviceIdentify + " 获取模拟通道失败！", oError.errorCode, oError.errorMsg);
        }
    });
    // 数字通道
    WebVideoCtrl.I_GetDigitalChannelInfo(szDeviceIdentify, {
        success: function (xmlDoc) {
            var oChannels = $(xmlDoc).find("InputProxyChannelStatus");

            $.each(oChannels, function (i) {
                var id = $(this).find("id").eq(0).text(),
                    name = $(this).find("name").eq(0).text(),
                    online = $(this).find("online").eq(0).text();
                if ("false" == online) {// 过滤禁用的数字通道
                    return true;
                }
                if ("" == name) {
                    name = "IPCamera " + (i < 9 ? "0" + (i + 1) : (i + 1));
                }
                oSel.append("<option value='" + id + "' bZero='false'>" + name + "</option>");
            });
            showOPInfo(szDeviceIdentify + " 获取数字通道成功！");
        },
        error: function (oError) {
            showOPInfo(szDeviceIdentify + " 获取数字通道失败！", oError.errorCode, oError.errorMsg);
        }
    });
    // 零通道
    WebVideoCtrl.I_GetZeroChannelInfo(szDeviceIdentify, {
        success: function (xmlDoc) {
            var oChannels = $(xmlDoc).find("ZeroVideoChannel");

            $.each(oChannels, function (i) {
                var id = $(this).find("id").eq(0).text(),
                    name = $(this).find("name").eq(0).text();
                if ("" == name) {
                    name = "Zero Channel " + (i < 9 ? "0" + (i + 1) : (i + 1));
                }
                if ("true" == $(this).find("enabled").eq(0).text()) {// 过滤禁用的零通道
                    oSel.append("<option value='" + id + "' bZero='true'>" + name + "</option>");
                }
            });
            showOPInfo(szDeviceIdentify + " 获取零通道成功！");
        },
        error: function (oError) {
            showOPInfo(szDeviceIdentify + " 获取零通道失败！", oError.errorCode, oError.errorMsg);
        }
    });
}

// 获取端口
function getDevicePort() {
    var szDeviceIdentify = $("#ip").val();

    if (null == szDeviceIdentify) {
        return;
    }

    var oPort = WebVideoCtrl.I_GetDevicePort(szDeviceIdentify).then((oPort) => {
        $("#deviceport").val(oPort.iDevicePort);
        $("#rtspport").val(oPort.iRtspPort);

        showOPInfo(szDeviceIdentify + " 获取端口成功！");
    }, (oError) => {
        var szInfo = "获取端口失败！";
        showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
    });
}

// 获取数字通道
async function clickGetDigitalChannelInfo() {
    var szDeviceIdentify = $("#ip").val(),
        iAnalogChannelNum = 0;

    $("#digitalchannellist").empty();

    if (null == szDeviceIdentify) {
        return;
    }

    // 模拟通道
    try {
        var oAnalogChannelInfo = await WebVideoCtrl.I_GetAnalogChannelInfo(szDeviceIdentify, {});
        iAnalogChannelNum = $(oAnalogChannelInfo).find("VideoInputChannel").length;
    } finally {
        // 数字通道
        WebVideoCtrl.I_GetDigitalChannelInfo(szDeviceIdentify, {
            success: function (xmlDoc) {
                var oChannels = $(xmlDoc).find("InputProxyChannelStatus");

                $.each(oChannels, function () {
                    var id = parseInt($(this).find("id").eq(0).text(), 10),
                        ipAddress = $(this).find("ipAddress").eq(0).text(),
                        srcInputPort = $(this).find("srcInputPort").eq(0).text(),
                        managePortNo = $(this).find("managePortNo").eq(0).text(),
                        online = $(this).find("online").eq(0).text(),
                        proxyProtocol = $(this).find("proxyProtocol").eq(0).text();

                    var objTr = $("#digitalchannellist").get(0).insertRow(-1);
                    var objTd = objTr.insertCell(0);
                    objTd.innerHTML = (id - iAnalogChannelNum) < 10 ? "D0" + (id - iAnalogChannelNum) : "D" + (id - iAnalogChannelNum);
                    objTd = objTr.insertCell(1);
                    objTd.width = "25%";
                    objTd.innerHTML = ipAddress;
                    objTd = objTr.insertCell(2);
                    objTd.width = "15%";
                    objTd.innerHTML = srcInputPort;
                    objTd = objTr.insertCell(3);
                    objTd.width = "20%";
                    objTd.innerHTML = managePortNo;
                    objTd = objTr.insertCell(4);
                    objTd.width = "15%";
                    objTd.innerHTML = "true" == online ? "在线" : "离线";
                    objTd = objTr.insertCell(5);
                    objTd.width = "25%";
                    objTd.innerHTML = proxyProtocol;
                });
                showOPInfo(szDeviceIdentify + " 获取数字通道成功！");
            },
            error: function (oError) {
                showOPInfo(szDeviceIdentify + " 没有数字通道！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}
// 开始预览
function clickStartRealPlay(iStreamType) {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szDeviceIdentify = $("#ip").val(),
        iRtspPort = parseInt($("#rtspport").val(), 10),
        iChannelID = parseInt($("#channels").val(), 10),
        bZeroChannel = $("#channels option").eq($("#channels").get(0).selectedIndex).attr("bZero") == "true" ? true : false,
        szInfo = "";

    if ("undefined" === typeof iStreamType) {
        iStreamType = parseInt($("#streamtype").val(), 10);
    }

    if (null == szDeviceIdentify) {
        return;
    }
    var startRealPlay = function () {
        WebVideoCtrl.I_StartRealPlay(szDeviceIdentify, {
            iStreamType: iStreamType,
            iChannelID: iChannelID,
            bZeroChannel: bZeroChannel,
            iPort: iRtspPort,
            success: function () {
                szInfo = "开始预览成功！";
                showOPInfo(szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                showOPInfo(szDeviceIdentify + " 开始预览失败！", oError.errorCode, oError.errorMsg);
            }
        });
    };

    if (oWndInfo != null) {// 已经在播放了，先停止
        WebVideoCtrl.I_Stop({
            success: function () {
                startRealPlay();
            }
        });
    } else {
        startRealPlay();
    }
}
function destroyPlugin() {
    WebVideoCtrl.I_DestroyPlugin().then(() => {
        showOPInfo('清除成功！')
    }).catch(() => {
        showOPInfo('清除失败！')
    })

}
function showPlugin() {
    WebVideoCtrl.I_ShowPlugin().then(() => {
        showOPInfo('展示成功！')
    }).catch(() => {
        showOPInfo('展示失败！')
    })

}
function hidPlugin() {
    WebVideoCtrl.I_HidPlugin().then(() => {
        showOPInfo('隐藏成功！')
    }).catch(() => {
        showOPInfo('隐藏失败！')
    })

}
function setTextOverlay() {
    var  szDeviceIdentify = $("#ip").val();
    var szInfo = "";
    var that = this;
    var iChannelID = parseInt($("#channels").val(), 10);
    var szUrl = "ISAPI/System/Video/inputs/channels/" + iChannelID + "/overlays";
    WebVideoCtrl.I_GetTextOverlay(szUrl,szDeviceIdentify,{
        success:function(data){
            $(data).find("TextOverlay").eq(0).find("displayText").eq(0).text("我tet");
            $(data).find("TextOverlay").eq(0).find("positionX").eq(0).text("20");
            $(data).find("TextOverlay").eq(0).find("positionY").eq(0).text("30");
            var xmldoc = toXMLStr(data);
            var newOptions = {
                type: "PUT",
                data: xmldoc,
                success: function(){
                    szInfo = "绘制osd信息成功";
                    showOPInfo(szDeviceIdentify + " " + szInfo);
                },
                error: function(oError){
                    showOPInfo(szDeviceIdentify + " 设置osd信息失败！", oError.errorCode, oError.errorMsg);
                }
            };

            WebVideoCtrl.I_SendHTTPRequest(szDeviceIdentify,szUrl,newOptions);
        },
        error: function(oError){
            showOPInfo(szDeviceIdentify + " 设置osd信息失败！", oError.errorCode, oError.errorMsg);
        }
    });
}
// 停止预览
function clickStopRealPlay() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_Stop({
            success: function () {
                szInfo = "停止预览成功！";
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                showOPInfo(szDeviceIdentify + " 停止预览失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 打开声音
function clickOpenSound() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        var allWndInfo = WebVideoCtrl.I_GetWindowStatus();
        // 循环遍历所有窗口，如果有窗口打开了声音，先关闭
        for (var i = 0, iLen = allWndInfo.length; i < iLen; i++) {
            oWndInfo = allWndInfo[i];
            if (oWndInfo.bSound) {
                WebVideoCtrl.I_CloseSound(oWndInfo.iIndex);
                break;
            }
        }

        WebVideoCtrl.I_OpenSound().then(() => {
            showOPInfo(oWndInfo.szDeviceIdentify + " " + "打开声音成功！");
        }, (oError) => {
            var szInfo = " 打开声音失败！";
            showOPInfo(oWndInfo.szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
        });
    }
}

// 关闭声音
function clickCloseSound() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_CloseSound().then(() => {
            showOPInfo(oWndInfo.szDeviceIdentify + " " + "关闭声音成功！");
        }, (oError) => {
            var szInfo = " 关闭声音失败！";
            showOPInfo(oWndInfo.szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
        });
    }
}

// 设置音量
function clickSetVolume() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        iVolume = parseInt($("#volume").val(), 10),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_SetVolume(iVolume).then(() => {
            showOPInfo(oWndInfo.szDeviceIdentify + " " + "设置音量成功");
        }, (oError) => {
            var szInfo = " 设置音量失败！";
            showOPInfo(oWndInfo.szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
        });
    }
}

// 抓图
async function clickCapturePic(szType) {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        var oLocalConfig = await WebVideoCtrl.I_GetLocalCfg();
        var szCaptureFileFormat = "0";
        if (oLocalConfig) {
            szCaptureFileFormat = oLocalConfig.captureFileFormat;
        }

        var szChannelID = $("#channels").val();
        var szPicName = oWndInfo.szDeviceIdentify + "_" + szChannelID + "_" + new Date().getTime();
        //如果是回放抓图，需要增加如下前缀："playback_"
        if ("playback" === szType) {
            szPicName = "playback_" + oWndInfo.szDeviceIdentify + "_" + szChannelID + "_" + new Date().getTime();
        }

        szPicName += ("0" === szCaptureFileFormat) ? ".jpg": ".bmp";

        WebVideoCtrl.I_CapturePic(szPicName, {
            bDateDir: true  //是否生成日期文件
        }).then(function(){
            szInfo = "抓图成功！";
            showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
        }, function(oError){
            szInfo = " 抓图失败！";
            showOPInfo(oWndInfo.szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
        });
    }
}
// 抓图
function clickCapturePicData() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";
    if (oWndInfo != null) {
        WebVideoCtrl.I_CapturePicData().then(function(data){
            console.log(data);
            szInfo = "抓图上传成功！";
            showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
        },function(){
            szInfo = "抓图失败！";
            showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
        });
    }
}

// 开始录像
var g_szRecordType = "";
function clickStartRecord(szType) {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    g_szRecordType = szType;

    if (oWndInfo != null) {
        var szChannelID = $("#channels").val(),
            szFileName = oWndInfo.szDeviceIdentify + "_" + szChannelID + "_" + new Date().getTime();

        WebVideoCtrl.I_StartRecord(szFileName, {
            bDateDir: true, //是否生成日期文件
            success: function () {
                if ('realplay' === szType) {
                    szInfo = "开始录像成功！";
                } else if ('playback' === szType) {
                    szInfo = "开始剪辑成功！";
                }
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                if ('realplay' === szType) {
                    szInfo = " 开始录像失败！";
                } else if ('playback' === szType) {
                    szInfo = " 开始剪辑失败！";
                }
                showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 停止录像
//TODO 保存视频路径到数据库
function clickStopRecord(szType, iWndIndex) {
    if ("undefined" === typeof iWndIndex) {
        iWndIndex = g_iWndIndex;
    }
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_StopRecord({
            success: function () {
                if ('realplay' === szType) {
                    szInfo = "停止录像成功！";
                } else if ('playback' === szType) {
                    szInfo = "停止剪辑成功！";
                }
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                if ('realplay' === szType) {
                    szInfo = "停止录像失败！";
                } else if ('playback' === szType) {
                    szInfo = "停止剪辑失败！";
                }
                sshowOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 获取对讲通道
function clickGetAudioInfo() {
    var szDeviceIdentify = $("#ip").val();

    if (null == szDeviceIdentify) {
        return;
    }

    WebVideoCtrl.I_GetAudioInfo(szDeviceIdentify, {
        success: function (xmlDoc) {
            var oAudioChannels = $(xmlDoc).find("TwoWayAudioChannel"),
                oSel = $("#audiochannels").empty();
            $.each(oAudioChannels, function () {
                var id = $(this).find("id").eq(0).text();

                oSel.append("<option value='" + id + "'>" + id + "</option>");
            });
            showOPInfo(szDeviceIdentify + " 获取对讲通道成功！");
        },
        error: function (oError) {
            showOPInfo(szDeviceIdentify + " 获取对讲通道失败！", oError.errorCode, oError.errorMsg);
        }
    });
}

// 开始对讲
function clickStartVoiceTalk() {
    var szDeviceIdentify = $("#ip").val(),
        iAudioChannel = parseInt($("#audiochannels").val(), 10),
        szInfo = "";

    if (null == szDeviceIdentify) {
        return;
    }

    if (isNaN(iAudioChannel)) {
        alert("请选择对讲通道！");
        return;
    }

    WebVideoCtrl.I_StartVoiceTalk(szDeviceIdentify, iAudioChannel).then(() => {
        szInfo = "开始对讲成功！";
        showOPInfo(szDeviceIdentify + " " + szInfo);
    }, (oError) => {
        var szInfo = " 开始对讲失败！";
        showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
    });
}

// 停止对讲
function clickStopVoiceTalk() {
    var szDeviceIdentify = $("#ip").val();
    WebVideoCtrl.I_StopVoiceTalk().then(() => {
        szInfo = "停止对讲成功！";
        showOPInfo(szDeviceIdentify + " " + szInfo);
    }, (oError) => {
        var szInfo = " 停止对讲失败！";
        showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
    });
}

// 启用电子放大
function clickEnableEZoom() {
    var szDeviceIdentify = $("#ip").val();
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_EnableEZoom().then(() => {
            szInfo = "启用电子放大成功！";
            showOPInfo(szDeviceIdentify + " " + szInfo);
        }, (oError) => {
            szInfo = "启用电子放大失败！";
            showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);

        });
    }
}

// 禁用电子放大
function clickDisableEZoom() {
    var szDeviceIdentify = $("#ip").val();
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_DisableEZoom().then(() => {
            szInfo = "禁用电子放大成功！";
            showOPInfo(szDeviceIdentify + " " + szInfo);
        }, (oError) => {
            szInfo = "禁用电子放大失败！";
            showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
        });
    }
}

// 启用3D放大
function clickEnable3DZoom() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";
    var szDeviceIdentify = $("#ip").val();

    if (oWndInfo != null) {
        WebVideoCtrl.I_Enable3DZoom().then(() => {
            szInfo = "启用3D放大成功！";
            showOPInfo(szDeviceIdentify + " " + szInfo);
        }, (oError) => {
            szInfo = "启用3D放大失败！";
            showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
        });
    }
}

// 禁用3D放大
function clickDisable3DZoom() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";
    var szDeviceIdentify = $("#ip").val();

    if (oWndInfo != null) {
        WebVideoCtrl.I_Disable3DZoom().then(() => {
            szInfo = "禁用3D放大成功！";
            showOPInfo(szDeviceIdentify + " " + szInfo);
        }, (oError) => {
            szInfo = "禁用3D放大失败！";
            showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
        });
    }
}

// 全屏
function clickFullScreen() {
    WebVideoCtrl.I_FullScreen(true).then(() => {
        showOPInfo("全屏成功");
    }, (oError) => {
        showOPInfo("全屏失败！", oError.errorCode, oError.errorMsg);
    });
}

// PTZ控制 9为自动，1,2,3,4,5,6,7,8为方向PTZ
var g_bPTZAuto = false;
function mouseDownPTZControl(iPTZIndex) {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        bZeroChannel = $("#channels option").eq($("#channels").get(0).selectedIndex).attr("bZero") == "true" ? true : false,
        iPTZSpeed = $("#ptzspeed").val();

    if (bZeroChannel) {// 零通道不支持云台
        return;
    }

    if (oWndInfo != null) {
        if (9 == iPTZIndex && g_bPTZAuto) {
            iPTZSpeed = 0;// 自动开启后，速度置为0可以关闭自动
        } else {
            g_bPTZAuto = false;// 点击其他方向，自动肯定会被关闭
        }

        WebVideoCtrl.I_PTZControl(iPTZIndex, false, {
            iPTZSpeed: iPTZSpeed,
            success: function (xmlDoc) {
                if (9 == iPTZIndex && g_bPTZAuto) {
                    showOPInfo(oWndInfo.szDeviceIdentify + " 停止云台成功！");
                } else {
                    showOPInfo(oWndInfo.szDeviceIdentify + " 开启云台成功！");
                }
                if (9 == iPTZIndex) {
                    g_bPTZAuto = !g_bPTZAuto;
                }
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 开启云台失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 方向PTZ停止
function mouseUpPTZControl() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(1, true, {
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 停止云台成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 停止云台失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 设置预置点
function clickSetPreset() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        iPresetID = parseInt($("#preset").val(), 10);

    if (oWndInfo != null) {
        WebVideoCtrl.I_SetPreset(iPresetID, {
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 设置预置点成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 设置预置点失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 调用预置点
function clickGoPreset() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        iPresetID = parseInt($("#preset").val(), 10);

    if (oWndInfo != null) {
        WebVideoCtrl.I_GoPreset(iPresetID, {
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 调用预置点成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 调用预置点失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 搜索录像
var g_iSearchTimes = 0;
function clickRecordSearch(iType) {
    var szDeviceIdentify = $("#ip").val(),
        iChannelID = parseInt($("#channels").val(), 10),
        bZeroChannel = $("#channels option").eq($("#channels").get(0).selectedIndex).attr("bZero") == "true" ? true : false,
        iStreamType = parseInt($("#record_streamtype").val(), 10),
        szStartTime = $("#starttime").val(),
        szEndTime = $("#endtime").val();
    if (Date.parse(szEndTime.replace(/-/g, "/")) - Date.parse(szStartTime.replace(/-/g, "/")) < 0) {
        alert("开始时间大于结束时间");
        return;
    }
    if (null == szDeviceIdentify) {
        return;
    }

    if (bZeroChannel) {// 零通道不支持录像搜索
        return;
    }

    if (0 == iType) {// 首次搜索
        $("#searchlist").empty();
        g_iSearchTimes = 0;
    }

    //如果是前端设备，需要将搜索时间转换为UTC时间
    WebVideoCtrl.I_RecordSearch(szDeviceIdentify, iChannelID, szStartTime, szEndTime, {
        iStreamType: iStreamType,
        iSearchPos: g_iSearchTimes,
        success: function (xmlDoc) {
            if ("MORE" === $(xmlDoc).find("responseStatusStrg").eq(0).text()) {
                for(var i = 0, nLen = $(xmlDoc).find("searchMatchItem").length; i < nLen; i++) {
                    var szPlaybackURI = $(xmlDoc).find("playbackURI").eq(i).text();
                    if(szPlaybackURI.indexOf("name=") < 0) {
                        break;
                    }
                    var szStartTime = $(xmlDoc).find("startTime").eq(i).text();
                    var szEndTime = $(xmlDoc).find("endTime").eq(i).text();
                    var szFileName = szPlaybackURI.substring(szPlaybackURI.indexOf("name=") + 5, szPlaybackURI.indexOf("&size="));

                    var objTr = $("#searchlist").get(0).insertRow(-1);
                    var objTd = objTr.insertCell(0);
                    objTd.id = "downloadTd" + i;
                    objTd.innerHTML = g_iSearchTimes + 1;
                    objTd = objTr.insertCell(1);
                    objTd.width = "30%";
                    objTd.innerHTML = szFileName;
                    objTd = objTr.insertCell(2);
                    objTd.width = "30%";
                    objTd.innerHTML = (szStartTime.replace("T", " ")).replace("Z", "");
                    objTd = objTr.insertCell(3);
                    objTd.width = "30%";
                    objTd.innerHTML = (szEndTime.replace("T", " ")).replace("Z", "");
                    objTd = objTr.insertCell(4);
                    objTd.width = "10%";
                    objTd.innerHTML = "<a href='javascript:;' onclick='clickStartDownloadRecord(" + g_iSearchTimes + ");'>下载</a>";
                    $("#downloadTd" + g_iSearchTimes).data("fileName", szFileName);
                    $("#downloadTd" + g_iSearchTimes).data("playbackURI", szPlaybackURI);
                    ++g_iSearchTimes;
                }

                clickRecordSearch(1);// 继续搜索
            } else if ("OK" === $(xmlDoc).find("responseStatusStrg").eq(0).text()) {
                var iLength = $(xmlDoc).find("searchMatchItem").length;
                for(var i = 0; i < iLength; i++) {
                    var szPlaybackURI = $(xmlDoc).find("playbackURI").eq(i).text();
                    if(szPlaybackURI.indexOf("name=") < 0) {
                        break;
                    }
                    var szStartTime = $(xmlDoc).find("startTime").eq(i).text();
                    var szEndTime = $(xmlDoc).find("endTime").eq(i).text();
                    var szFileName = szPlaybackURI.substring(szPlaybackURI.indexOf("name=") + 5, szPlaybackURI.indexOf("&size="));

                    var objTr = $("#searchlist").get(0).insertRow(-1);
                    var objTd = objTr.insertCell(0);
                    objTd.id = "downloadTd" + i;
                    objTd.innerHTML = g_iSearchTimes + 1;
                    objTd = objTr.insertCell(1);
                    objTd.width = "30%";
                    objTd.innerHTML = szFileName;
                    objTd = objTr.insertCell(2);
                    objTd.width = "30%";
                    objTd.innerHTML = (szStartTime.replace("T", " ")).replace("Z", "");
                    objTd = objTr.insertCell(3);
                    objTd.width = "30%";
                    objTd.innerHTML = (szEndTime.replace("T", " ")).replace("Z", "");
                    objTd = objTr.insertCell(4);
                    objTd.width = "10%";
                    objTd.innerHTML = "<a href='javascript:;' onclick='clickStartDownloadRecord(" + g_iSearchTimes + ");'>下载</a>";
                    $("#downloadTd" + g_iSearchTimes).data("fileName", szFileName);
                    $("#downloadTd" + g_iSearchTimes).data("playbackURI", szPlaybackURI);
                    ++g_iSearchTimes;
                }
                showOPInfo(szDeviceIdentify + " 搜索录像文件成功！");
            } else if("NO MATCHES" === $(xmlDoc).find("responseStatusStrg").eq(0).text()) {
                setTimeout(function() {
                    g_iSearchTimes = 0;
                    showOPInfo(szDeviceIdentify + " 没有录像文件！");
                }, 50);
            }
        },
        error: function (oError) {
            g_iSearchTimes = 0;
            showOPInfo(szDeviceIdentify + " 搜索录像文件失败！", oError.errorCode, oError.errorMsg);
        }
    });
}

// 开始回放
function clickStartPlayback() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szDeviceIdentify = $("#ip").val(),
        iRtspPort = parseInt($("#rtspport").val(), 10),
        iStreamType = parseInt($("#record_streamtype").val(), 10),
        bZeroChannel = $("#channels option").eq($("#channels").get(0).selectedIndex).attr("bZero") == "true" ? true : false,
        iChannelID = parseInt($("#channels").val(), 10),
        szStartTime = $("#starttime").val(),
        szEndTime = $("#endtime").val(),
        szInfo = "",
        bChecked = $("#transstream").prop("checked"),
        iRet = -1;

    if (null == szDeviceIdentify) {
        return;
    }

    if (bZeroChannel) {// 零通道不支持回放
        return;
    }

    var startPlayback = function () {
        if (bChecked) {// 启用转码回放
            var oTransCodeParam = {
                TransFrameRate: "14",// 0：全帧率，5：1，6：2，7：4，8：6，9：8，10：10，11：12，12：16，14：15，15：18，13：20，16：22
                TransResolution: "1",// 255：Auto，3：4CIF，2：QCIF，1：CIF
                TransBitrate: "19"// 2：32K，3：48K，4：64K，5：80K，6：96K，7：128K，8：160K，9：192K，10：224K，11：256K，12：320K，13：384K，14：448K，15：512K，16：640K，17：768K，18：896K，19：1024K，20：1280K，21：1536K，22：1792K，23：2048K，24：3072K，25：4096K，26：8192K
            };
            WebVideoCtrl.I_StartPlayback(szDeviceIdentify, {
                iRtspPort: iRtspPort,
                iStreamType: iStreamType,
                iChannelID: iChannelID,
                szStartTime: szStartTime,
                szEndTime: szEndTime,
                oTransCodeParam: oTransCodeParam,
                success: function () {
                    szInfo = "开始回放成功！";
                    showOPInfo(szDeviceIdentify + " " + szInfo);
                },
                error: function (oError) {
                    szInfo = "开始回放失败！";
                    showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
                }
            });
        } else {
            WebVideoCtrl.I_StartPlayback(szDeviceIdentify, {
                iRtspPort: iRtspPort,
                iStreamType: iStreamType,
                iChannelID: iChannelID,
                szStartTime: szStartTime,
                szEndTime: szEndTime,
                success: function () {
                    szInfo = "开始回放成功！";
                    showOPInfo(szDeviceIdentify + " " + szInfo);
                },
                error: function (oError) {
                    szInfo = "开始回放失败！";
                    showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
                }
            });
        }
    };

    if (oWndInfo != null) {// 已经在播放了，先停止
        WebVideoCtrl.I_Stop({
            success: function () {
                startPlayback();
            }
        });
    } else {
        startPlayback();
    }
}

// 停止回放
function clickStopPlayback() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_Stop({
            success: function () {
                szInfo = "停止回放成功！";
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                szInfo = "停止回放失败！";
                showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 开始倒放
function clickReversePlayback() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szDeviceIdentify = $("#ip").val(),
        iRtspPort = parseInt($("#rtspport").val(), 10),
        iStreamType = parseInt($("#record_streamtype").val(), 10),
        bZeroChannel = $("#channels option").eq($("#channels").get(0).selectedIndex).attr("bZero") == "true" ? true : false,
        iChannelID = parseInt($("#channels").val(), 10),
        szStartTime = $("#starttime").val(),
        szEndTime = $("#endtime").val(),
        szInfo = "";

    if (null == szDeviceIdentify) {
        return;
    }

    if (bZeroChannel) {// 零通道不支持倒放
        return;
    }

    var reversePlayback = function () {
        WebVideoCtrl.I_ReversePlayback(szDeviceIdentify, {
            iRtspPort: iRtspPort,
            iStreamType: iStreamType,
            iChannelID: iChannelID,
            szStartTime: szStartTime,
            szEndTime: szEndTime
        }).then(() => {
            szInfo = "开始倒放成功！";
            showOPInfo(szDeviceIdentify + " " + szInfo);
        }, (oError) => {
            szInfo = "开始倒放失败！";
            showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
        });
    };

    if (oWndInfo != null) {// 已经在播放了，先停止
        WebVideoCtrl.I_Stop({
            success: function () {
                reversePlayback();
            }
        });
    } else {
        reversePlayback();
    }
}

// 单帧
function clickFrame() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_Frame({
            success: function () {
                szInfo = "单帧播放成功！";
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                szInfo = "单帧播放失败！";
                showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 暂停
function clickPause() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_Pause({
            success: function () {
                szInfo = "暂停成功！";
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                szInfo = "暂停失败！";
                showOPInfo(oWndInfo.szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 恢复
function clickResume() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_Resume({
            success: function () {
                szInfo = "恢复成功！";
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                szInfo = "恢复失败！";
                showOPInfo(oWndInfo.szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 慢放
function clickPlaySlow() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_PlaySlow({
            success: function () {
                szInfo = "慢放成功！";
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                szInfo = "慢放失败！";
                showOPInfo(oWndInfo.szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 快放
function clickPlayFast() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex),
        szInfo = "";

    if (oWndInfo != null) {
        WebVideoCtrl.I_PlayFast({
            success: function () {
                szInfo = "快放成功！";
                showOPInfo(oWndInfo.szDeviceIdentify + " " + szInfo);
            },
            error: function (oError) {
                szInfo = "快放失败！";
                showOPInfo(oWndInfo.szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// OSD时间
function clickGetOSDTime() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_GetOSDTime({
            success: function (szOSDTime) {
                $("#osdtime").val(szOSDTime);
                showOPInfo(oWndInfo.szDeviceIdentify + " 获取OSD时间成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 获取OSD时间失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 下载录像
var g_iDownloadID = -1;
var g_tDownloadProcess = 0;
function clickStartDownloadRecord(i) {
    var szDeviceIdentify = $("#ip").val(),
        szChannelID = $("#channels").val(),
        szFileName = $("#downloadTd" + i).data("fileName"),
        szPlaybackURI = $("#downloadTd" + i).data("playbackURI");

    if (null == szDeviceIdentify) {
        return;
    }

    WebVideoCtrl.I_StartDownloadRecord(szDeviceIdentify, szPlaybackURI, szFileName, {
        bDateDir: true  //是否生成日期文件
    }).then((iDownloadID) => {
        g_iDownloadID = iDownloadID;
        $("<div id='downProcess' class='freeze'></div>").appendTo("body");
        g_tDownloadProcess = setInterval("downProcess(" + i + ")", 1000);
    }, (oError) => {
        WebVideoCtrl.I_GetLastError().then((iErrorValue) => {
            if (34 == iErrorValue) {
                showOPInfo(szDeviceIdentify + " 已下载！");
            } else if (33 == iErrorValue) {
                showOPInfo(szDeviceIdentify + " 空间不足！");
            } else {
                showOPInfo(szDeviceIdentify + " 下载失败！");
            }
        });
    });
}
function clickStartDownloadRecordByTime() {
    var szDeviceIdentify = $("#ip").val(),
        szChannelID = $("#channels").val(),
        szFileName = $("#downloadTd0").data("fileName"),
        szPlaybackURI = $("#downloadTd0").data("playbackURI"),
        szStartTime = $("#downloadstarttime").val(),
        szEndTime = $("#downloadendtime").val();
    if (null == szDeviceIdentify) {
        return;
    }
    if (Date.parse(szEndTime.replace(/-/g, "/")) - Date.parse(szStartTime.replace(/-/g, "/")) < 0) {
        alert("开始时间大于结束时间");
        return;
    }
    WebVideoCtrl.I_StartDownloadRecordByTime(szDeviceIdentify, szPlaybackURI, szFileName, szStartTime,szEndTime,{
        bDateDir: true  //是否生成日期文件
    }).then((iDownloadID) => {
        g_iDownloadID = iDownloadID;
        $("<div id='downProcess' class='freeze'></div>").appendTo("body");
        g_tDownloadProcess = setInterval("downProcess(" + 0 + ")", 1000);
    }, (oError) => {
        showOPInfo(szDeviceIdentify + " 下载失败！");
    });
}

function clickStopDownload() {
    WebVideoCtrl.I_StopDownloadRecord(g_iDownloadID).then(() => {
        showOPInfo("停止下载成功！");
        clearInterval(g_tDownloadProcess);
        g_tDownloadProcess = 0;
        g_iDownloadID = -1;
        $("#downProcess").remove();
    }, (oError) => {
        showOPInfo(szDeviceIdentify + " 停止下载失败！", oError.errorCode, oError.errorMsg);
    });
}
// 下载进度
async function downProcess() {
    var iStatus = await WebVideoCtrl.I_GetDownloadStatus(g_iDownloadID);
    if (0 == iStatus) {
        $("#downProcess").css({
            width: $("#searchlist").width() + "px",
            height: "100px",
            lineHeight: "100px",
            left: $("#searchdiv").offset().left + "px",
            top: $("#searchdiv").offset().top + "px"
        });
        var iProcess = await WebVideoCtrl.I_GetDownloadProgress(g_iDownloadID);
        if (iProcess < 0) {
            clearInterval(g_tDownloadProcess);
            g_tDownloadProcess = 0;
            g_iDownloadID = -1;
        } else if (iProcess < 100) {
            $("#downProcess").text(iProcess + "%");
        } else {
            $("#downProcess").text("100%");
            setTimeout(function () {
                $("#downProcess").remove();
            }, 1000);

            await WebVideoCtrl.I_StopDownloadRecord(g_iDownloadID);

            showOPInfo("录像下载完成！");
            clearInterval(g_tDownloadProcess);
            g_tDownloadProcess = 0;
            g_iDownloadID = -1;
        }
    } else {
        await WebVideoCtrl.I_StopDownloadRecord(g_iDownloadID);

        clearInterval(g_tDownloadProcess);
        g_tDownloadProcess = 0;
        g_iDownloadID = -1;
    }
}

// 导出配置文件
function clickExportDeviceConfig() {
    var szDeviceIdentify = $("#ip").val(),
        szInfo = "";

    if (null == szDeviceIdentify) {
        return;
    }
    var szDevicePassWord = $("#edfpassword").val();

    WebVideoCtrl.I_ExportDeviceConfig(szDeviceIdentify,szDevicePassWord).then(() => {
        szInfo = "导出配置文件成功！";
        showOPInfo(szDeviceIdentify + " " + szInfo);
    }, (oError) => {
        szInfo = "导出配置文件失败！";
        showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
    });
}

// 导入配置文件
function clickImportDeviceConfig() {
    var szDeviceIdentify = $("#ip").val(),
        szFileName = $("#configFile").val(),
        szDevicePassWord = $("#edfpassword").val(),
        szInfo = "";
    if (null == szDeviceIdentify) {
        return;
    }

    if ("" == szFileName) {
        alert("请选择配置文件！");
        return;
    }

    WebVideoCtrl.I_ImportDeviceConfig(szDeviceIdentify, szFileName,szDevicePassWord).then(() => {
        szInfo = "导入成功！";
        showOPInfo(szDeviceIdentify + " " + szInfo);
        WebVideoCtrl.I_Restart(szDeviceIdentify, {
            success: function (xmlDoc) {
                $("<div id='restartDiv' class='freeze'>重启中...</div>").appendTo("body");
                var oSize = getWindowSize();
                $("#restartDiv").css({
                    width: oSize.width + "px",
                    height: oSize.height + "px",
                    lineHeight: oSize.height + "px",
                    left: 0,
                    top: 0
                });
                setTimeout("reconnect('" + szDeviceIdentify + "')", 20000);
            },
            error: function (oError) {
                showOPInfo(szDeviceIdentify + " 重启失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }, (oError) => {
        szInfo = "导入失败！";
        showOPInfo(szDeviceIdentify + szInfo, oError.errorCode, oError.errorMsg);
    });
}

// 重连
function reconnect(szDeviceIdentify) {
    WebVideoCtrl.I_Reconnect(szDeviceIdentify, {
        timeout: 3000,
        success: function (xmlDoc) {
            $("#restartDiv").remove();
        },
        error: function () {
            setTimeout(function () {reconnect(szDeviceIdentify);}, 5000);
        }
    });
}

// 开始升级
var g_tUpgrade = 0;
function clickStartUpgrade(szDeviceIdentify) {
    var szDeviceIdentify = $("#ip").val(),
        szFileName = $("#upgradeFile").val();

    if (null == szDeviceIdentify) {
        return;
    }

    if ("" == szFileName) {
        alert("请选择升级文件！");
        return;
    }
    WebVideoCtrl.I_StartUpgrade(szDeviceIdentify, szFileName).then(function(){
        g_tUpgrade = setInterval("getUpgradeStatus('" + szDeviceIdentify + "')", 1000);
    },function(){
        clearInterval(g_tUpgrade);
        showOPInfo(szDeviceIdentify + " 升级失败！");
    });
}

// 获取升级状态
async function getUpgradeStatus(szDeviceIdentify) {
    var bUpdating = await WebVideoCtrl.I_UpgradeStatus(szDeviceIdentify);
    if (bUpdating) {
        var iProcess = await WebVideoCtrl.I_UpgradeProgress(szDeviceIdentify);
        if (iProcess < 0) {
            clearInterval(g_tUpgrade);
            g_tUpgrade = 0;
            showOPInfo(szDeviceIdentify + " 获取进度失败！");
            return;
        } else if (iProcess < 100) {
            if (0 == $("#restartDiv").length) {
                $("<div id='restartDiv' class='freeze'></div>").appendTo("body");
                var oSize = getWindowSize();
                $("#restartDiv").css({
                    width: oSize.width + "px",
                    height: oSize.height + "px",
                    lineHeight: oSize.height + "px",
                    left: 0,
                    top: 0
                });
            }
            $("#restartDiv").text(iProcess + "%");
        } else {
            await WebVideoCtrl.I_StopUpgrade();
            clearInterval(g_tUpgrade);
            g_tUpgrade = 0;

            $("#restartDiv").remove();

            WebVideoCtrl.I_Restart(szDeviceIdentify, {
                success: function (xmlDoc) {
                    $("<div id='restartDiv' class='freeze'>重启中...</div>").appendTo("body");
                    var oSize = getWindowSize();
                    $("#restartDiv").css({
                        width: oSize.width + "px",
                        height: oSize.height + "px",
                        lineHeight: oSize.height + "px",
                        left: 0,
                        top: 0
                    });
                    setTimeout("reconnect('" + szDeviceIdentify + "')", 20000);
                },
                error: function (oError) {
                    showOPInfo(szDeviceIdentify + " 重启失败！", oError.errorCode, oError.errorMsg);
                }
            });
        }
    } else {
        await WebVideoCtrl.I_StopUpgrade();
        clearInterval(g_tUpgrade);
        g_tUpgrade = 0;

        $("#restartDiv").remove();

        WebVideoCtrl.I_Restart(szDeviceIdentify, {
            success: function () {
                $("<div id='restartDiv' class='freeze'>重启中...</div>").appendTo("body");
                var oSize = getWindowSize();
                $("#restartDiv").css({
                    width: oSize.width + "px",
                    height: oSize.height + "px",
                    lineHeight: oSize.height + "px",
                    left: 0,
                    top: 0
                });
                setTimeout("reconnect('" + szDeviceIdentify + "')", 20000);
            },
            error: function (oError) {
                showOPInfo(szDeviceIdentify + " 重启失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 检查插件版本
function clickCheckPluginVersion() {
    var szDeviceIdentify = $("#ip").val();
    WebVideoCtrl.I_CheckPluginVersion().then((bNeedUpdate) => {
        if (bNeedUpdate) {
            alert("检测到新的插件版本！");
        } else {
            alert("您的插件版本已经是最新的！");
        }
    }, () => {
        showOPInfo(szDeviceIdentify + " 检测插件新版本失败");
    });
}

function clickRestoreDefault() {
    var szDeviceIdentify = $("#ip").val(),
        szMode = "basic";
    WebVideoCtrl.I_RestoreDefault(szDeviceIdentify, szMode).then(() => {
        $("#restartDiv").remove();
        showOPInfo(szDeviceIdentify + " 恢复默认参数成功！");
    }, (oError) => {
        showOPInfo(szDeviceIdentify + " 恢复默认参数失败！", oError.errorCode, oError.errorMsg);
    });
}

function PTZZoomIn() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(10, false, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 调焦+成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  调焦+失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

function PTZZoomout() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(11, false, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 调焦-成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  调焦-失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

function PTZZoomStop() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(11, true, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 调焦停止成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  调焦停止失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

function PTZFocusIn() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(12, false, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 聚焦+成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  聚焦+失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

function PTZFoucusOut() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(13, false, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 聚焦-成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  聚焦-失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

function PTZFoucusStop() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(12, true, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 聚焦停止成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  聚焦停止失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

function PTZIrisIn() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(14, false, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 光圈+成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  光圈+失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

function PTZIrisOut() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(15, false, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 光圈-成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  光圈-失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

function PTZIrisStop() {
    var oWndInfo = WebVideoCtrl.I_GetWindowStatus(g_iWndIndex);

    if (oWndInfo != null) {
        WebVideoCtrl.I_PTZControl(14, true, {
            iWndIndex: g_iWndIndex,
            success: function (xmlDoc) {
                showOPInfo(oWndInfo.szDeviceIdentify + " 光圈停止成功！");
            },
            error: function (oError) {
                showOPInfo(oWndInfo.szDeviceIdentify + "  光圈停止失败！", oError.errorCode, oError.errorMsg);
            }
        });
    }
}

// 切换模式
function changeIPMode(iType) {
    var arrPort = [0, 7071, 80];

    $("#serverport").val(arrPort[iType]);
}

// 获取设备IP，B1暂不支持
// function clickGetDeviceIP() {
//     var iDeviceMode = parseInt($("#devicemode").val(), 10),
//         szAddress = $("#serveraddress").val(),
//         iPort = parseInt($("#serverport").val(), 10) || 0,
//         szDeviceID = $("#deviceid").val(),
//         szDeviceInfo = "";

//     szDeviceInfo = WebVideoCtrl.I_GetIPInfoByMode(iDeviceMode, szAddress, iPort, szDeviceID);

//     if ("" == szDeviceInfo) {
//         showOPInfo("设备IP和端口解析失败！");
//     } else {
//         showOPInfo("设备IP和端口解析成功！");

//         var arrTemp = szDeviceInfo.split("-");
//         $("#loginip").val(arrTemp[0]);
//         $("#deviceport").val(arrTemp[1]);
//     }
// }

// 启用多边形绘制
var g_bEnableDraw = false;
function clickEnableDraw() {
    WebVideoCtrl.I_SetPlayModeType(6).then(() => {
        g_bEnableDraw = true;
        showOPInfo("启用绘制成功！");
    }, (oError) => {
        showOPInfo("启用绘制失败！", oError.errorCode, oError.errorMsg);
    });
}

// 禁用多边形绘制
function clickDisableDraw() {
    WebVideoCtrl.I_SetSnapDrawMode(0, -1).then(() => {
        g_bEnableDraw = false;
        showOPInfo("禁用绘制成功！");
    }, (oError) => {
        showOPInfo("禁用绘制失败！", oError.errorCode, oError.errorMsg);
    });
}

// 添加图形，最多不超过16个图形
function clickAddSnapPolygon() {
    if (!g_bEnableDraw) {
        return;
    }

    var szId = $("#snapId").val();
    var szName = encodeString($("#snapName").val());

    var szInfo = "<?xml version='1.0' encoding='utf-8'?>";
    szInfo += "<SnapPolygonList>";
    szInfo += "<SnapPolygon>";
    szInfo += "<id>" + szId + "</id>";          // [1, 32]
    szInfo += "<polygonType>0</polygonType>"; //如果想绘制多边形，polygonType指需要改为1
    szInfo += "<PointNumMax>17</PointNumMax>";  // [MinClosed, 17]
    szInfo += "<MinClosed>4</MinClosed>";       // [4, 17]
    szInfo += "<tips>#" + szId + "#" + szName + "</tips>";
    szInfo += "<isClosed>false</isClosed>";
    szInfo += "<color><r>0</r><g>255</g><b>0</b></color>";
    szInfo += "<pointList/>";
    szInfo += "</SnapPolygon>";
    szInfo += "</SnapPolygonList>";

    WebVideoCtrl.I_SetSnapPolygonInfo(g_iWndIndex, szInfo).then(() => {
        showOPInfo("添加图形成功！");
    });
    WebVideoCtrl.I_SetSnapDrawMode(g_iWndIndex, 2);
}

// 删除图形
function clickDelSnapPolygon() {
    if (!g_bEnableDraw) {
        return;
    }

    var szId = $("#snapId").val();
    var aShapes = [];
    aShapes.push({
        polygonType: 0,
        id: szId
    });

    WebVideoCtrl.I_ClearSnapInfo(g_iWndIndex, aShapes);
}

// 获取图形，保存到自己数据库中
function clickGetSnapPolygon() {
    WebVideoCtrl.I_GetSnapPolygonInfo(g_iWndIndex).then((szXml) => {
        alert(szXml);
    });
}

// 设置图形，页面打开时可以设置以前设置过的图形
function clickSetSnapPolygon() {
    if (!g_bEnableDraw) {
        return;
    }

    WebVideoCtrl.I_ClearSnapInfo(g_iWndIndex);

    var szInfo = "<?xml version='1.0' encoding='utf-8'?>";
    szInfo += "<SnapPolygonList>";
    szInfo += "<SnapPolygon>";
    szInfo += "<id>1</id>";
    szInfo += "<polygonType>1</polygonType>";
    szInfo += "<tips>#1#设置1</tips>";
    szInfo += "<isClosed>true</isClosed>";
    szInfo += "<color><r>0</r><g>255</g><b>0</b></color>";
    szInfo += "<pointList>";
    szInfo += "<point><x>0.737903</x><y>0.229730</y></point>";
    szInfo += "<point><x>0.947581</x><y>0.804054</y></point>";
    szInfo += "<point><x>0.362903</x><y>0.777027</y></point>";
    szInfo += "</pointList>";
    szInfo += "</SnapPolygon>";
    szInfo += "<SnapPolygon>";
    szInfo += "<id>2</id>";
    szInfo += "<polygonType>0</polygonType>";
    szInfo += "<tips>#2#设置2</tips>";
    szInfo += "<isClosed>true</isClosed>";
    szInfo += "<color><r>255</r><g>255</g><b>0</b></color>";
    szInfo += "<pointList>";
    szInfo += "<point><x>0.2</x><y>0.2</y></point>";
    szInfo += "<point><x>0.8</x><y>0.2</y></point>";
    szInfo += "<point><x>0.8</x><y>0.8</y></point>";
    szInfo += "<point><x>0.2</x><y>0.8</y></point>";
    szInfo += "</pointList>";
    szInfo += "</SnapPolygon>";
    szInfo += "</SnapPolygonList>";

    WebVideoCtrl.I_SetSnapPolygonInfo(g_iWndIndex, szInfo).then(() => {
        showOPInfo("设置图形成功！");
    }, (oError) => {
        showOPInfo("设置图形失败！", oError.errorCode, oError.errorMsg);
    });
}

// 清空图形
function clickDelAllSnapPolygon() {
    if (!g_bEnableDraw) {
        return;
    }

    WebVideoCtrl.I_ClearSnapInfo(g_iWndIndex).then(() => {
        showOPInfo("清空图形成功！");
    }, (oError) => {
        showOPInfo("清空图形失败！", oError.errorCode, oError.errorMsg);
    });
}

// 设备抓图
function clickDeviceCapturePic() {
    var szInfo = "";
    var szDeviceIdentify = $("#ip").val();
    var bZeroChannel = $("#channels option").eq($("#channels").get(0).selectedIndex).attr("bZero") == "true" ? true : false;
    var iChannelID = parseInt($("#channels").val(), 10);
    var iResolutionWidth = parseInt($("#resolutionWidth").val(), 10);
    var iResolutionHeight = parseInt($("#resolutionHeight").val(), 10);

    if (null == szDeviceIdentify) {
        return;
    }

    if (bZeroChannel) {// 零通道不支持设备抓图
        return;
    }

    var szPicName = szDeviceIdentify + "_" + iChannelID + "_" + new Date().getTime();
    var iRet = WebVideoCtrl.I_DeviceCapturePic(szDeviceIdentify, iChannelID, szPicName, {
        bDateDir: true,  //是否生成日期文件
        iResolutionWidth: iResolutionWidth,
        iResolutionHeight: iResolutionHeight
    });

    if (0 == iRet) {
        szInfo = "设备抓图成功！";
    } else {
        szInfo = "设备抓图失败！";
    }
    showOPInfo(szDeviceIdentify + " " + szInfo);
}

function loadXML(szXml) {
    if(null == szXml || "" == szXml) {
        return null;
    }

    var oXmlDoc = null;

    if (window.DOMParser) {
        var oParser = new DOMParser();
        oXmlDoc = oParser.parseFromString(szXml, "text/xml");
    } else {
        oXmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        oXmlDoc.async = false;
        oXmlDoc.loadXML(szXml);
    }

    return oXmlDoc;
}

function toXMLStr(oXmlDoc) {
    var szXmlDoc = "";

    try {
        var oSerializer = new XMLSerializer();
        szXmlDoc = oSerializer.serializeToString(oXmlDoc);
    } catch (e) {
        try {
            szXmlDoc = oXmlDoc.xml;
        } catch (e) {
            return "";
        }
    }
    if (szXmlDoc.indexOf("<?xml") == -1) {
        szXmlDoc = "<?xml version='1.0' encoding='utf-8'?>" + szXmlDoc;
    }

    return szXmlDoc;
}

function encodeString(str) {
    if (str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    } else {
        return "";
    }
}


