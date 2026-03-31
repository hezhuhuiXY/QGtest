package com.system.mapper;

import com.system.pojo.Admin;

public interface AdminMapper {
    Admin selectByUsername(String username);
    void insertAdmin(Admin admin);
    Admin selectByadminId(String adminId);
}
