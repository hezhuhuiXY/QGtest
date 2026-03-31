package com.system.mapper;
import com.system.pojo.Repair;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
@Mapper
public interface RepairMapper {
    List<Repair> selectAll();
    void deleteByIds(@Param("ids") int[] id);
    List<Repair> selectByStudentId(String studentId);
    void insert(Repair repair);
    List<Repair> selectByCondition(@Param("status") String status);
    void updateStatus(@Param("id") Integer id, @Param("status") String status);
    List<Repair> selectById(int id);
}
