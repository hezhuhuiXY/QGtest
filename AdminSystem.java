import java.sql.*;
import java.util.ArrayList;
import java.util.Scanner;

public class AdminSystem {
    private static final String DB_URL = System.getenv("DB_URL");
    private static final String DB_USER = System.getenv("DB_USER");
    private static final String DB_PASSWORD = System.getenv("DB_PASSWORD");
    private static Scanner input=new Scanner(System.in);
    private static ArrayList<StudentUser> stuUser=new ArrayList<>();
    private static ArrayList<AdminUser> adminUser=new ArrayList<>();
    private static StudentUser matchStudent = null;
    private static AdminUser matchAdmin=null;
    public static void main(String[] args){
       loadAllFromDB();
        while(true){
            printfMenu();
            int choice=input.nextInt();
            dealChoice(choice);
        }
    }
    private static void loadAllFromDB(){
        String sql1 = "select * from student_user";
        try (Connection conn = getConn() ){
            PreparedStatement ps = conn.prepareStatement(sql1);
            ResultSet rs = ps.executeQuery();

           while(rs.next()){
               String studentId = rs.getString("student_id");
               String password = rs.getString("password");
               String dormitory = rs.getString("dormitory");

              stuUser.add(new StudentUser(studentId,password,dormitory));
           }

        } catch (SQLException e) {
            throw new RuntimeException(e);
        }

    }
        private static void printfMenu () {
            System.out.println("======================");
            System.out.println("宿舍报修管理系统");
            System.out.println("1.登录");
            System.out.println("2.注册");
            System.out.println("3.退出");
            System.out.println("请选择操作(输入1~3)");
        }

        private static void dealChoice ( int choice){
            switch (choice) {
                case 1:
                    System.out.println("====用户登录====");
                    logIn();
                    break;
                case 2:
                    System.out.println("====用户注册====");
                    numEnroll();
                    break;
                case 3:
                    System.out.println("退出成功!");
                    System.exit(0);
            }
        }

        private static void logIn () {
            System.out.println("请选择登录角色（1-学生，2-维修人员）");
            int roleChoice = input.nextInt();
            input.nextLine(); // 吸收换行符

            if (roleChoice == 1) {
                // 学生登录
                System.out.println("请输入学号：");
                String stuId = input.nextLine();
                System.out.println("请输入密码：");
                String pwd = input.nextLine();

                // 遍历学生列表验证
                boolean stuLogin = false;
                for (StudentUser stu : stuUser) {
                    if (stu.getStudentId().equals(stuId) && stu.getPassword().equals(pwd)) {
                        stuLogin = true;
                        matchStudent = stu;
                        break;
                    }
                }
                if (stuLogin) {
                    System.out.println("学生登录成功！欢迎使用宿舍报修系统~");
                    printStudentMenu();
                    studentChoice();
                } else {
                    System.out.println("学号或密码错误，登录失败！");
                }
            } else if (roleChoice == 2) {
                // 维修人员登录
                System.out.println("请输入工号：");
                String adminId = input.nextLine();
                System.out.println("请输入密码：");
                String pwd = input.nextLine();

                // 遍历管理员列表验证
                boolean adminLoginSuccess = false;
                for (AdminUser admin : adminUser) {
                    if (admin.getAdminId().equals(adminId) && admin.getPassword().equals(pwd)) {
                        adminLoginSuccess = true;
                        matchAdmin = admin;
                        break;
                    }
                }
                if (adminLoginSuccess) {
                    System.out.println("维修人员登录成功！欢迎使用宿舍报修系统");
                    adminMenu();
                    adminChoice();
                } else {
                    System.out.println("工号或密码错误，登录失败！");
                }
            }
        }
        private static void numEnroll () {

            System.out.println("请选择角色（1-学生，2-维修人员）");
            int role = input.nextInt();
            if (role == 1) {

                System.out.println("请输入学号（前缀3125或3225）");
                String studentId = input.next();
                System.out.println("请输入密码");
                String password = input.next();
                stuUser.add(new StudentUser("学生", studentId, password));
                String insertStuSql = "INSERT INTO student_user (student_id, password, dormitory) VALUES (?, ?, ?)";
                try (Connection conn = getConn();
                     PreparedStatement pstmt = conn.prepareStatement(insertStuSql)) {

                    // 给SQL参数赋值（宿舍号初始为空，后续可绑定）
                    pstmt.setString(1, studentId);
                    pstmt.setString(2, password);
                    pstmt.setString(3, "");
                    int rows = pstmt.executeUpdate();
                }catch (SQLException e){
                    e.printStackTrace();
                }
            } else if (role == 2) {
                System.out.println("请输入工号");
                String AdminId = input.next();
                System.out.println("请输入密码");
                String password = input.next();
                adminUser.add(new AdminUser("管理员", AdminId, password));
                String insertAdminSql="INSERT INTO admin_user (admin_id, password) VALUES (?, ?)";
                try(Connection conn=getConn()){
                    PreparedStatement pstmt=conn.prepareStatement(insertAdminSql);
                    pstmt.setString(1, AdminId);
                    pstmt.setString(2, password);
                    pstmt.executeUpdate();
                }catch (SQLException e){
                    e.printStackTrace();}

            }
            System.out.println("注册成功,请返回登录页面");

        }
        private static void studentChoice () {
            int choice = input.nextInt();
            switch (choice) {
                case 1:
                    bindDormitory();
                    break;
                case 2:
                    createRepairOrder ();
                    break;
                case 3:
                    showMyRepairs();
                    break;
                case 4:
                    try {
                        deleteRepairOrder();
                    } catch (SQLException e) {
                        throw new RuntimeException(e);
                    }
                    break;
                case 5:
                    changePassword();
                    break;
                case 6:
                    matchStudent=null;
                    System.out.println("退出成功");
                    System.exit(0);
            }
        }
        private static void printStudentMenu () {
            System.out.println("===== 学生菜单 =====");
            System.out.println("1. 绑定/修改宿舍");
            System.out.println("2. 创建报修单");
            System.out.println("3. 查看我的报修记录");
            System.out.println("4. 取消报修单");
            System.out.println("5. 修改密码");
            System.out.println("6. 退出");
            System.out.print("请选择操作（输入 1-6）：");
        }
        private static void bindDormitory () {
            String currentDorm = matchStudent.getDormitory();
            if (currentDorm == null || currentDorm.isEmpty()) {
                System.out.println("===== 绑定宿舍号 =====");
            } else {
                System.out.println("===== 修改宿舍号 =====");
                System.out.println("当前绑定的宿舍号：" + currentDorm);
                System.out.println("是否确认修改？（Y/N）");
                String confirm = input.nextLine();
                if (!confirm.equalsIgnoreCase("Y")) {
                } else if (confirm.equalsIgnoreCase("N")) {
                    System.out.println("取消修改宿舍号");
                    return;
                }
            }

            // 输入并校验宿舍号（示例：格式如 1栋302、5号楼405 等，可自定义规则）
            System.out.println("请输入宿舍号（格式示例：1栋302、5号楼405）：");
            String dormitory = input.nextLine().trim();
            // 保存宿舍号
            matchStudent.setDormitory(dormitory);
            System.out.println(STR."宿舍号\{currentDorm == null ? "绑定" : "修改"}成功！当前宿舍号：\{dormitory}");
            // 简单校验宿舍号非空
            if (dormitory.isEmpty()) {
                System.out.println("宿舍号不能为空！绑定失败");
                return;
            }


        }
        private static void createRepairOrder (){
           String id=matchStudent.getStudentId();
            System.out.print("请输入报修内容：");
            String content = input.nextLine();
            // 先查学生当前宿舍
            String dorm = matchStudent.getDormitory();
            if (dorm == null) {
                System.out.println("请先绑定宿舍！");
                return;
            }
            String sql = "INSERT INTO repair_order(student_id, dorm, content) VALUES (?, ?, ?)";
            try (Connection conn = getConn(); PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, id);
                pstmt.setString(2, dorm);
                pstmt.setString(3, content);
                pstmt.executeUpdate();
                System.out.println("报修单创建成功！");
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
    private static void showMyRepairs() {
        String sql = "select * from repair_order";
        try (Connection conn = getConn(); PreparedStatement pst = conn.prepareStatement(sql)) {
            ResultSet rs = pst.executeQuery();

            System.out.println("\n===== 我的报修单 =====");
            boolean has = false;
            while (rs.next()) {
                has = true;
                if(rs.getString("student_id").equals(matchStudent.getStudentId())){
                System.out.println("单号：" + rs.getInt("id"));
                System.out.println("宿舍：" + rs.getString("dorm"));
                System.out.println("内容：" + rs.getString("content"));
                System.out.println("状态：" + rs.getString("status"));
                System.out.println("时间：" + rs.getTimestamp("create_time"));
                }
                System.out.println("-------------------");

            }
            if (!has) System.out.println("暂无报修单");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
private static void deleteRepairOrder() throws SQLException {
    String studentId = matchStudent.getStudentId();
    String deleteSql = "DELETE FROM repair_order WHERE id = ? AND student_id = ?";
    System.out.print("请输入要删除的报修单ID：");
    String orderId = input.nextLine();
    try (Connection conn = getConn()) {
        try (PreparedStatement deletePstmt = conn.prepareStatement(deleteSql)) {
            deletePstmt.setInt(1, Integer.parseInt(orderId));
            deletePstmt.setString(2, studentId);
            int affectedRows = deletePstmt.executeUpdate();
        }

    }
}
        private static void changePassword(){
            System.out.println("===== 修改密码 =====");
            System.out.print("请输入原密码：");
            String oldPwd = input.nextLine();

            // 校验旧密码是否正确
            if (!matchStudent.getPassword().equals(oldPwd)) {
                System.out.println("原密码错误！修改失败");
                return;
            }
            System.out.print("请输入新密码：");
            String newPwd = input.nextLine();
            System.out.print("请再次输入新密码：");
            String confirmPwd = input.nextLine();
            if(!newPwd.equals(confirmPwd)){
                System.out.println("两次输入的密码不同,修改失败");
                return;
            }
            matchStudent.setPassword(newPwd);
            String updateSql = "update student_user set password = ? where student_id = ?";
            try (Connection conn = getConn();
                 PreparedStatement pstmt = conn.prepareStatement(updateSql)) {

                pstmt.setString(1, newPwd);
                pstmt.setString(2, matchStudent.getStudentId());

                int affectedRows = pstmt.executeUpdate();
                if (affectedRows > 0) {
                    System.out.println("密码修改成功！请使用新密码登录");
                } else {
                    // 数据库修改失败时，回滚ArrayList中的密码
                    matchStudent.setPassword(oldPwd);
                    System.out.println("密码修改失败！数据库更新异常");
                }
            } catch (SQLException e) {
                // 异常时回滚ArrayList中的密码
                matchStudent.setPassword(oldPwd);
                System.out.println("数据库操作异常：" + e.getMessage());
                System.out.println("密码修改失败");
            }
        }

        private static void adminMenu(){
        System.out.println("===== 管理员菜单 =====");
            System.out.println("1. 查看所有报修单");
            System.out.println("2. 查看报修单详情");
            System.out.println("3. 更新报修单状态");
            System.out.println("4. 删除报修单");
            System.out.println("5. 修改密码");
            System.out.println("6. 退出");
            System.out.println("请选择操作（输入 1-6）：");
        }
        private static void adminChoice(){
        int choice =input.nextInt();
        switch (choice) {
            case 1:repairMenu();
                   break;
            case 2:repairContent();
                   break;
            case 3:changeStatus();
                   break;
            case 4:adminDeleteRepairOrder();
                    break;
            case 5: changeAminPassword();
                    break;
            case 6:
                System.out.println("退出成功");
                System.exit(0);
        }
        }
        private static void repairMenu(){
        String sql = "select id,student_id,dorm,status from repair_order";
       try(Connection conn=getConn()){
        PreparedStatement pstmt=conn.prepareStatement(sql);
        ResultSet rs=pstmt.executeQuery();
        while(rs.next()){
            System.out.println("单号:"+rs.getInt("id"));
            System.out.println("学号:"+rs.getString("student_id"));
            System.out.println("宿舍:"+rs.getString("dorm"));
            System.out.println("状态:"+rs.getString("status"));
            System.out.println("-------------------");
        }
        }catch (SQLException e){
                e.printStackTrace();}
        }
        private static void repairContent(){
        System.out.println("请输入单号:");
        int num =input.nextInt();
        String sql="select id,student_id,dorm,content from repair_order";
                    try(Connection conn=getConn()){
                    PreparedStatement pstmt=conn.prepareStatement(sql);
                    ResultSet rs=pstmt.executeQuery();
                    while(rs.next()){
                        if(rs.getInt("id")==num) {
                            System.out.println("单号:" + rs.getInt("id"));
                            System.out.println("学号:" + rs.getString("student_id"));
                            System.out.println("宿舍:" + rs.getString("dorm"));
                            System.out.println("内容:" + rs.getString("content"));
                            System.out.println("状态:" + rs.getString("status"));
                            System.out.println("-------------------");
                        }
                        }
                }catch (SQLException e){
                    e.printStackTrace();}
        }
        private static void changeStatus(){
        System .out.println("请输入需要更改的维修单单号");
        int choiceId=input.nextInt();
        System.out.println("请选择更新的状态");
            System.out.println("1. 待维修");
            System.out.println("2. 处理中");
            System.out.println("3. 已完成");
            int choice= input.nextInt();
            String newStatus=switch (choice) {
                case 1->"待维修";
                case 2->"处理中";
                case 3->"已完成";
                default -> null;
            };
        String sql="select id,status from repair_order";
        String updatesql="update repair_order set status=?";
        try(Connection conn= getConn()){
        PreparedStatement pstmt=conn.prepareStatement(sql);
        PreparedStatement pstmt1=conn.prepareStatement(updatesql);
        ResultSet rs=pstmt.executeQuery();
        while(rs.next()){
            if(rs.getInt("id")==choiceId){
            pstmt1.setString(1,newStatus);
            System.out.println("报修单"+choiceId+"状态更新成功");
            break;
            }
        }
        }catch(SQLException e) {

        }
        }
    private static void adminDeleteRepairOrder() {
        System.out.print("请输入要删除的报修单ID：");
        String orderId = input.nextLine();

        String deleteSql = "DELETE FROM repair_order WHERE id = ? ";

        try (Connection conn = getConn()) {
            PreparedStatement deletePstmt = conn.prepareStatement(deleteSql);
            deletePstmt.setInt(1,Integer.parseInt(orderId));
            int affectedRows=deletePstmt.executeUpdate();
        if (affectedRows > 0) {
            System.out.println("报修单ID: " + orderId + " 删除成功！");
        } else {
            System.out.println("未找到该报修单，删除失败！");
        }
    } catch (NumberFormatException e) {
        System.out.println("输入的ID不是有效数字，请重新输入！");
    } catch (SQLException e) {
        System.out.println("数据库操作失败：" + e.getMessage());
        throw e;
    }
    }
    private static void changeAminPassword(){
        System.out.println("===== 修改密码 =====");
        System.out.print("请输入原密码：");
        String oldPwd = input.nextLine();

        // 校验旧密码是否正确
        if (!matchAdmin.getPassword().equals(oldPwd)) {
            System.out.println("原密码错误！修改失败");
            return;
        }
        System.out.print("请输入新密码：");
        String newPwd = input.nextLine();
        System.out.print("请再次输入新密码：");
        String confirmPwd = input.nextLine();
        if(!newPwd.equals(confirmPwd)){
            System.out.println("两次输入的密码不同,修改失败");
            return;
        }
        matchAdmin.setPassword(newPwd);
        String updateSql = "update student_user set password = ? where student_id = ?";
        try (Connection conn = getConn();
             PreparedStatement pstmt = conn.prepareStatement(updateSql)) {

            pstmt.setString(1, newPwd);
            pstmt.setString(2, matchAdmin.getAdminId());

            int affectedRows = pstmt.executeUpdate();
            if (affectedRows > 0) {
                System.out.println("密码修改成功！请使用新密码登录");
            } else {
                // 数据库修改失败时，回滚ArrayList中的密码
                matchStudent.setPassword(oldPwd);
                System.out.println("密码修改失败！数据库更新异常");
            }
        } catch (SQLException e) {
            // 异常时回滚ArrayList中的密码
            matchStudent.setPassword(oldPwd);
            System.out.println("数据库操作异常：" + e.getMessage());
            System.out.println("密码修改失败");
        }
    }
        private static Connection getConn () throws SQLException {
            Connection conn = null;
            try {
                // 建立数据库连接
                conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
                System.out.println("数据库连接成功！");
            } catch (SQLException e) {
                System.out.println("数据库连接失败：" + e.getMessage());
                throw e;
            }
            return conn;
        }
        }
