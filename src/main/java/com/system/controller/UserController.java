package com.system.controller;
import com.system.util.JwtUtil;
import org.springframework.web.bind.annotation.PostMapping;
import com.system.common.R;
import com.system.mapper.AdminMapper;
import com.system.mapper.StudentMapper;
import com.system.pojo.Admin;
import com.system.pojo.Student;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final StudentMapper studentMapper;
    private final AdminMapper adminMapper;

    // 学生登录
    @PostMapping("/student/login")
    public R<Map<String, Object>> studentLogin(@RequestBody Student student) {
        Student s = studentMapper.selectByStudentId(student.getStudentId());
        if (s == null || !s.getPassword().equals(student.getPassword())) {
            return R.fail("账号或密码错误");
        }
        String token = JwtUtil.generateToken(s.getStudentId(), "student");
        Map<String, Object> data = new HashMap<>();
        data.put("user", s);
        data.put("token", token);
        return R.ok(data);
    }
    // 管理员登录
    @PostMapping("/admin/login")
    public R<Map<String, Object>> adminLogin(@RequestBody Admin admin) {
        Admin a = adminMapper.selectByadminId(admin.getAdminId());
        if (a == null || !a.getPassword().equals(admin.getPassword())) {
            return R.fail("账号或密码错误");
        }
        String token = JwtUtil.generateToken(a.getAdminId(), "admin");
        Map<String, Object> result = Map.of("user", a, "token", token);
        return R.ok(result);
    }
    // 学生注册
    @PostMapping("/student/register")
    public R<?> studentRegister(@RequestBody Student student) {
        student.setDormitory("");
        studentMapper.insert(student);
        return R.ok(null);
    }

    // 管理员注册
    @PostMapping("/admin/register")
    public R<?> adminRegister(@RequestBody Admin admin) {
        adminMapper.insertAdmin(admin);
        return R.ok(null);
    }
}
