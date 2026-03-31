package com.system.controller;

import com.system.common.R;
import com.system.mapper.RepairMapper;
import com.system.pojo.Repair;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.annotations.Param;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.system.util.JwtUtil;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/repair")
@RequiredArgsConstructor
public class RepairController {

    private final RepairMapper repairMapper;

    // 创建报修单
    @PostMapping("/add")
    public R<?> add(@RequestBody Repair repair) {
        repairMapper.insert(repair);
        return R.ok(null);
    }

    // 我的报修单
    @GetMapping("/my")
    public R<List<Repair>> myList(@RequestParam String studentId) {
        return R.ok(repairMapper.selectByStudentId(studentId));
    }

    // 删除报修单
    @DeleteMapping("/delete")
    public R<?> delete(@RequestParam int[] ids) {
        repairMapper.deleteByIds(ids);
        return R.ok(null);
    }

    // RepairController.java 添加权限验证
    @GetMapping("/all")
    public R<List<Repair>> all(@RequestHeader("Authorization") String token) {
        // 验证是否为管理员
        String role = JwtUtil.getRoleFromToken(token.replace("Bearer ", ""));
        if (!"admin".equals(role)) {
            return R.fail("无权限访问");
        }
        return R.ok(repairMapper.selectAll());
    }

    @GetMapping("/condition")
    public R<List<Repair>> condition(@RequestParam String status) {
     return R.ok(repairMapper.selectByCondition(status));
    }
    // 报修单详情
    @GetMapping("/detail")
    public R<Repair> detail(@RequestParam Integer id) {
        return R.ok((Repair) repairMapper.selectById(id));
    }

    // 修改状态
    @PostMapping("/updateStatus")
    public R<?> updateStatus(@RequestParam Integer id, @RequestParam String status) {
        repairMapper.updateStatus(id, status);
        return R.ok(null);
    }
}