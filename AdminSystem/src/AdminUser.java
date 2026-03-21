public class AdminUser {
    private String role;
    private String adminId;
    private String password;

    public AdminUser(String role, String studentId, String password) {
        this.role = role;
        this.adminId = studentId;
        this.password = password;
    }
    public String getRole() {
        return role;
    }

    public String getAdminId() {
        return adminId;
    }

    public String getPassword() {
        return password;
    }
    public void setPassword(String password) {
        this.password = password;}
}
