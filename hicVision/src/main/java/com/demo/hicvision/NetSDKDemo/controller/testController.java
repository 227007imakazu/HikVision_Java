package com.demo.hicvision.NetSDKDemo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * @version 1.0
 * @Author Imak
 * @Date 2025/4/18 11:03
 * @注释
 */
@Controller
@RequestMapping("/")
public class testController {


    @GetMapping("/")
    public String index(){
        return "hikvision/hik";
    }
}
