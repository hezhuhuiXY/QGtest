package com.system.controller;

import com.system.common.R;
import com.system.mapper.StudentMapper;
import com.system.pojo.Student;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
public class StudentController {

    private final StudentMapper studentMapper;

    // 绑定/修改宿舍
    @PostMapping("/bindDorm")
    public R<?> bindDorm(@RequestBody Student student) {
        studentMapper.update(student);
        return R.ok(null);
    }

    // 修改密码
    // StudentController.java
    @PostMapping("/updatePwd")
    public R<?> updatePwd(@RequestBody Map<String, String> params) {
        String studentId = params.get("studentId");
        String oldPassword = params.get("oldPassword");
        String newPassword = params.get("newPassword");

        // 验证旧密码
        Student student = studentMapper.selectByStudentId(studentId);
        if (student == null || !student.getPassword().equals(oldPassword)) {
            return R.fail("原密码错误");
        }

        student.setPassword(newPassword);
        studentMapper.update(student);
        return R.ok(null);
    }
}