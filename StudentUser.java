public class StudentUser {
        private String role;
        private String studentId;
        private String password;
        private String dormitory;
    public StudentUser(String role, String studentId, String password) {
            this.role = role;
            this.studentId = studentId;
            this.password = password;
    }
    public String getRole() {
        return role;
    }

    public String getStudentId() {
        return studentId;
    }

    public String getPassword() {
        return password;
    }
    public void setPassword(String password) {
        this.password = password;
    }
    public String getDormitory() {
        return dormitory;
    }

    public void setDormitory(String dormitory) {
        this.dormitory = dormitory;
    }
}

