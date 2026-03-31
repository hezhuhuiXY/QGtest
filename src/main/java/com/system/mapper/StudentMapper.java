package com.system.mapper;
import com.system.pojo.Student;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
@Mapper
public interface StudentMapper {
    List<Student> selectAll();
    Student selectByStudentId(String studentId);
    String update(Student student);
    void deleteById(int id);
    void insert(Student student);
}
