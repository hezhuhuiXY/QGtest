-- auto-generated definition
create table admin_user
(
    id       int auto_increment
        primary key,
    admin_id varchar(20) not null,
    password varchar(50) not null,
    constraint admin_id
        unique (admin_id)
);

-- auto-generated definition
create table student_user
(
    id         int auto_increment
        primary key,
    student_id varchar(10) not null,
    password   varchar(50) not null,
    dormitory  varchar(20) null,
    constraint student_id
        unique (student_id)
);

-- auto-generated definition
create table repair_order
(
    id          int auto_increment
        primary key,
    student_id  varchar(10)                           null comment '学号',
    dorm        varchar(50)                           null comment '宿舍',
    content     varchar(500)                          null comment '报修单',
    status      varchar(20) default '待维修'          null,
    create_time datetime    default CURRENT_TIMESTAMP null,
    constraint repair_order_ibfk_1
        foreign key (student_id) references student_user (student_id)
);

create index student_id
    on repair_order (student_id);

