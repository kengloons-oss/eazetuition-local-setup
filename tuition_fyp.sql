-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 20, 2025 at 09:55 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tuition_fyp`
--

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `announcement_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `content` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `expiry_at` datetime NOT NULL,
  `target_role` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `attendance_time` datetime NOT NULL,
  `status` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- --------------------------------------------------------

--
-- Table structure for table `chat_room`
--

CREATE TABLE `chat_room` (
  `chat_room_id` int(11) NOT NULL ,
  `room_name` varchar(100) NOT NULL,
  `room_type` varchar(50) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_datetime` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_room_member`
--

CREATE TABLE `chat_room_member` (
  `chat_room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_datetime` datetime NOT NULL,
  `role` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class`
--

CREATE TABLE `class` (
  `class_id` int(11) NOT NULL ,
  `tutor_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `class_type` varchar(5) NOT NULL,
  `time_per_week` int(11) NOT NULL CHECK (`time_per_week` between 0 and 99),
  `duration` BIGINT NOT NULL,
  `is_open_for_schedule` varchar(5) NOT NULL,
  `status` varchar(5) NOT NULL DEFAULT '1' CHECK (`status` in ('0','1'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


--
-- Table structure for table `class_detail`
--

CREATE TABLE `class_detail` (
  `class_detail_id` int(11) NOT NULL ,
  `class_id` int(11) NOT NULL,
  `day_of_week` varchar(20) DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `status` varchar(5) NOT NULL DEFAULT '1' CHECK (`status` in ('0','1'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_enrollment`
--

CREATE TABLE `class_enrollment` (
  `class_enrollment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `set_id` int(11) NOT NULL,
  `class_detail_id` int(11) NOT NULL,
  `enroll_datetime` datetime NOT NULL,
  `status` varchar(5) NOT NULL DEFAULT '1' CHECK (`status` in ('0','1'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `class_session`
--

CREATE TABLE `class_session` (
  `session_id` int(11) NOT NULL,
  `schedule_id` int(11) NOT NULL,
  `schedule_datetime` datetime NOT NULL,
  `attendance_code` varchar(20) DEFAULT NULL,
  `code_expiry_datetime` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `discount_metric`
--

CREATE TABLE `discount_metric` (
  `discount_id` int(11) NOT NULL,
  `num_of_enrolment` int(11) NOT NULL,
  `discount_amt` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `education_level`
--

CREATE TABLE `education_level` (
  `edu_lvl_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `evaluationanswerlog`
--

CREATE TABLE `evaluationanswerlog` (
  `answer_id` int(11) NOT NULL,
  `result_id` int(11) DEFAULT NULL,
  `question_id` int(11) DEFAULT NULL,
  `selected_answer` char(1) DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluationlevel`
--

CREATE TABLE `evaluationlevel` (
  `score` int(11) NOT NULL,
  `level_name` varchar(50) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluationquestion`
--

CREATE TABLE `evaluationquestion` (
  `question_id` int(11) NOT NULL,
  `test_id` int(11) DEFAULT NULL,
  `question_text` text DEFAULT NULL,
  `option_a` text DEFAULT NULL,
  `option_b` text DEFAULT NULL,
  `option_c` text DEFAULT NULL,
  `option_d` text DEFAULT NULL,
  `correct_answer` char(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluationupload`
--

CREATE TABLE `evaluationupload` (
  `upload_id` int(11) NOT NULL,
  `filename` text DEFAULT NULL,
  `uploaded_by` text DEFAULT NULL,
  `upload_time` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluation_metrics`
--

CREATE TABLE `evaluation_metrics` (
  `evaluation_metrics_id` int(11) NOT NULL,
  `homework_id` int(11) DEFAULT NULL,
  `extension_file` varchar(255) DEFAULT NULL,
  `homework_subject` varchar(100) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `accuracy` float DEFAULT NULL,
  `precision_score` float DEFAULT NULL,
  `recall` float DEFAULT NULL,
  `f1_score` float DEFAULT NULL,
  `loss` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluation_test`
--

CREATE TABLE `evaluation_test` (
  `test_id` int(11) NOT NULL,
  `upload_id` int(11) DEFAULT NULL,
  `test_level` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluation_upload`
--

CREATE TABLE `evaluation_upload` (
  `upload_id` int(11) NOT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `upload_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `homework`
--

CREATE TABLE `homework` (
  `homework_id` int(11) NOT NULL,
  `homework_subject` varchar(100) NOT NULL,
  `due_date` date NOT NULL,
  `create_by` int(11) NOT NULL,
  `class_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message`
--

CREATE TABLE `message` (
  `message_id` int(11) NOT NULL,
  `chat_room_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `send_datetime` datetime NOT NULL,
  `read_by` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`read_by`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `other_service`
--

CREATE TABLE `other_service` (
  `service_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `service_type` varchar(10) NOT NULL,
  `fee_type` varchar(10) NOT NULL,
  `deposit_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `service_fee_per_month` decimal(10,2) NOT NULL DEFAULT 0.00,
  `service_fee_per_attend` decimal(10,2) NOT NULL DEFAULT 0.00,
  `address` text DEFAULT NULL,
  `status` varchar(10) NOT NULL DEFAULT '1' CHECK (`status` in ('0','1'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `other_service_attendance`
--

CREATE TABLE `other_service_attendance` (
  `other_service_att_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `attendance_time` datetime NOT NULL,
  `comment` text DEFAULT NULL,
  `status` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `other_service_session`
--

CREATE TABLE `other_service_session` (
  `session_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `service_date` date NOT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `parent`
--

CREATE TABLE `parent` (
  `parent_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tel_no` varchar(15) NOT NULL,
  `occupation` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

CREATE TABLE `payment` (
  `payment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `discount_amt` decimal(10,2) NOT NULL DEFAULT 0.00,
  `final_amt` decimal(10,2) NOT NULL DEFAULT 0.00,
  `received_amt` decimal(10,2) NOT NULL DEFAULT 0.00,
  `change_amt` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(10) NULL,
  `payment_datetime` datetime NULL,
  `created_datetime` datetime NOT NULL,
  `payment_type` varchar(20) NULL,
  `payment_status` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_detail`
--

CREATE TABLE `payment_detail` (
  `payment_detail_id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `class_detail_id` int(11) NULL, 
  `set_id` int(11) NULL,
  `class_enrollment_id` int(11) NULL,
  `service_id` int(11) NULL,
  `service_name` varchar(100) DEFAULT NULL,
  `service_fee` decimal(10,2) DEFAULT NULL,
  `service_attend_time` int(11) DEFAULT NULL,
  `class_name` varchar(100) DEFAULT NULL,
  `class_fee` decimal(10,2) DEFAULT NULL,
  `fee_type` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `room`
--

CREATE TABLE `room` (
  `room_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `room_type` varchar(10) NOT NULL,
  `max_capacity` int(11) NOT NULL CHECK (`max_capacity` between 0 and 999),
  `status` varchar(10) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedule_package`
--

CREATE TABLE `schedule_package` (
  `package_id` int(11) NOT NULL,
  `edu_lvl_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `year` int(11) NOT NULL,
  `created_datetime` datetime NOT NULL,
  `is_open_for_enrollment` varchar(10) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedule_package_set`
--

CREATE TABLE `schedule_package_set` (
  `set_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_datetime` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `package_set_detail`
--

CREATE TABLE `package_set_detail` (
  `set_id` int(11) NOT NULL,
  `class_detail_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `max_capacity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_enrollment`
--

CREATE TABLE `service_enrollment` (
  `service_enrollment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `enroll_datetime` datetime NOT NULL,
  `address` longtext NULL,
  `status` varchar(10) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student`
--

CREATE TABLE `student` (
  `student_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `parent_id` int(11) NOT NULL,
  `edu_lvl_id` int(11) NOT NULL,
  `age` int(11) NOT NULL CHECK (`age` between 1 and 99),
  `payment_status` varchar(5) NOT NULL DEFAULT '0' CHECK (`payment_status` in ('0','1'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studentevaluationresult`
--

CREATE TABLE `studentevaluationresult` (
  `result_id` int(11) NOT NULL,
  `test_id` int(11) DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `level_name` varchar(100) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subject`
--

CREATE TABLE `subject` (
  `subject_id` int(11) NOT NULL,
  `edu_lvl_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `normal_class_fee` decimal(10,2) NOT NULL,
  `focus_class_fee` decimal(10,2) NOT NULL,
  `material_fee` decimal(10,2) NOT NULL,
  `status` varchar(5) NOT NULL DEFAULT '1' CHECK (`status` in ('0','1'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `submission`
--

CREATE TABLE `submission` (
  `submission_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `homework_id` int(11) NOT NULL,
  `extension_file` varchar(255) DEFAULT NULL,
  `homework_subject` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  `comment` text DEFAULT NULL,
  `upload_time` datetime DEFAULT NULL,
  `graded_time` datetime DEFAULT NULL,
  `grade` float DEFAULT NULL,
  `feedback_from_tutor` text DEFAULT NULL,
  `feedback_from_ai` text DEFAULT NULL,
  `ai_grade` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_user`
--

CREATE TABLE `system_user` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `ic_no` varchar(50) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT '1' CHECK (`status` in ('0','1')),
  `type` enum('', 'parent','student','tutor') NULL,
  `profile_pic` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `time_schedule`
--

CREATE TABLE `time_schedule` (
  `schedule_id` int(11) NOT NULL,
  `class_detail_id` int(11) NOT NULL,
  `set_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime NOT NULL,
  `type` varchar(10) NOT NULL DEFAULT '1',
  `student_enroll` int(11) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `tutor`
--

CREATE TABLE `tutor` (
  `tutor_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tel_no` varchar(15) NOT NULL,
  `age` int(11) NOT NULL CHECK (`age` between 1 and 99),
  `position` varchar(50) NOT NULL,
  `salary` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`announcement_id`);
ALTER TABLE `announcement` MODIFY `announcement_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`attendance_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `session_id` (`session_id`);
ALTER TABLE `attendance` MODIFY `attendance_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `chat_room`
--
ALTER TABLE `chat_room`
  ADD PRIMARY KEY (`chat_room_id`),
  ADD KEY `created_by` (`created_by`);
ALTER TABLE `chat_room` MODIFY `chat_room_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `chat_room_member`
--
ALTER TABLE `chat_room_member`
  ADD PRIMARY KEY (`chat_room_id`,`user_id`),
  ADD KEY `chat_room_id` (`chat_room_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `class`
--
ALTER TABLE `class`
  ADD PRIMARY KEY (`class_id`),
  ADD KEY `tutor_id` (`tutor_id`),
  ADD KEY `subject_id` (`subject_id`);
ALTER TABLE `class` MODIFY `class_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `class_detail`
--
ALTER TABLE `class_detail`
  ADD PRIMARY KEY (`class_detail_id`),
  ADD KEY `class_id` (`class_id`);
ALTER TABLE `class_detail` MODIFY `class_detail_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `class_enrollment`
--
ALTER TABLE `class_enrollment`
  ADD PRIMARY KEY (`class_enrollment_id`),
  ADD KEY `set_id` (`set_id`),
  ADD KEY `class_detail_id` (`class_detail_id`),
  ADD KEY `student_id` (`student_id`);
ALTER TABLE `class_enrollment` MODIFY `class_enrollment_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `class_session`
--
ALTER TABLE `class_session`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `schedule_id` (`schedule_id`);
ALTER TABLE `class_session` MODIFY `session_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `discount_metric`
--
ALTER TABLE `discount_metric`
  ADD PRIMARY KEY (`discount_id`);
ALTER TABLE `discount_metric` MODIFY `discount_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `education_level`
--
ALTER TABLE `education_level`
  ADD PRIMARY KEY (`edu_lvl_id`);
ALTER TABLE `education_level` MODIFY `edu_lvl_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `evaluationanswerlog`
--
ALTER TABLE `evaluationanswerlog`
  ADD PRIMARY KEY (`answer_id`),
  ADD KEY `result_id` (`result_id`),
  ADD KEY `question_id` (`question_id`);
ALTER TABLE `evaluationanswerlog` MODIFY `answer_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `evaluationquestion`
--
ALTER TABLE `evaluationquestion`
  ADD PRIMARY KEY (`question_id`),
  ADD KEY `test_id` (`test_id`);
ALTER TABLE `evaluationquestion` MODIFY `question_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `evaluationupload`
--
ALTER TABLE `evaluationupload`
  ADD PRIMARY KEY (`upload_id`);
ALTER TABLE `evaluationupload` MODIFY `upload_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `evaluation_metrics`
--
ALTER TABLE `evaluation_metrics`
  ADD PRIMARY KEY (`evaluation_metrics_id`),
  ADD KEY `homework_id` (`homework_id`);
ALTER TABLE `evaluation_metrics` MODIFY `evaluation_metrics_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `evaluation_metrics`
--
ALTER TABLE `evaluation_test`
  ADD PRIMARY KEY (`test_id`),
  ADD KEY `upload_id` (`upload_id`);
ALTER TABLE `evaluation_test` MODIFY `test_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `evaluation_upload`
--
ALTER TABLE `evaluation_upload`
  ADD PRIMARY KEY (`upload_id`);
ALTER TABLE `evaluation_upload` MODIFY `upload_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `homework`
--
ALTER TABLE `homework`
  ADD PRIMARY KEY (`homework_id`);
ALTER TABLE `homework` MODIFY `homework_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `message_id`
--
ALTER TABLE `message`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `chat_room_id` (`chat_room_id`),
  ADD KEY `user_id` (`sender_id`);
ALTER TABLE `message` MODIFY `message_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `other_service`
--
ALTER TABLE `other_service`
  ADD PRIMARY KEY (`service_id`);
ALTER TABLE `other_service` MODIFY `service_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `other_service_attendance`
--
ALTER TABLE `other_service_attendance`
  ADD PRIMARY KEY (`other_service_att_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `session_id` (`session_id`);
ALTER TABLE `other_service_attendance` MODIFY `other_service_att_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `other_service_session`
--
ALTER TABLE `other_service_session`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `tutor_id` (`tutor_id`);
ALTER TABLE `other_service_session` MODIFY `session_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `parent`
--
ALTER TABLE `parent`
  ADD PRIMARY KEY (`parent_id`),
  ADD KEY `user_id` (`user_id`);
ALTER TABLE `parent` MODIFY `parent_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `student_id` (`student_id`);
ALTER TABLE `payment` MODIFY `payment_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `payment_detail`
--
ALTER TABLE `payment_detail`
  ADD PRIMARY KEY (`payment_detail_id`),
  ADD KEY `payment_id` (`payment_id`),
  ADD KEY `class_enrollment_id` (`class_enrollment_id`),
  ADD KEY `service_id` (`service_id`);
ALTER TABLE `payment_detail` MODIFY `payment_detail_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `room`
--
ALTER TABLE `room`
  ADD PRIMARY KEY (`room_id`);
ALTER TABLE `room` MODIFY `room_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `schedule_package`
--
ALTER TABLE `schedule_package`
  ADD PRIMARY KEY (`package_id`),
  ADD KEY `edu_lvl_id` (`edu_lvl_id`);
ALTER TABLE `schedule_package` MODIFY `package_id` INT(11) AUTO_INCREMENT;

ALTER TABLE `schedule_package_set`
  ADD PRIMARY KEY (`set_id`),
  ADD KEY `package_id` (`package_id`);
ALTER TABLE `schedule_package_set` MODIFY `set_id` INT(11) AUTO_INCREMENT;

ALTER TABLE `package_set_detail`
  ADD PRIMARY KEY (`set_id`, `class_detail_id`),
  ADD KEY `set_id` (`set_id`),
  ADD KEY `class_detail_id` (`class_detail_id`),
  ADD KEY `room_id` (`room_id`);

ALTER TABLE `service_enrollment`
  ADD PRIMARY KEY (`service_enrollment_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `service_id` (`service_id`);
ALTER TABLE `service_enrollment` MODIFY `service_enrollment_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `studentevaluationresult`
--
ALTER TABLE `studentevaluationresult`
  ADD PRIMARY KEY (`result_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `test_id` (`test_id`);
ALTER TABLE `studentevaluationresult` MODIFY `result_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `subject`
--
ALTER TABLE `subject`
  ADD PRIMARY KEY (`subject_id`),
  ADD KEY `edu_lvl_id` (`edu_lvl_id`);
ALTER TABLE `subject` MODIFY `subject_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `submission`
--
ALTER TABLE `submission`
  ADD PRIMARY KEY (`submission_id`),
  ADD KEY `homework_id` (`homework_id`),
  ADD KEY `student_id` (`student_id`);
ALTER TABLE `submission` MODIFY `submission_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`student_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `edu_lvl_id` (`edu_lvl_id`);
ALTER TABLE `student` MODIFY `student_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `system_user`
--
ALTER TABLE `system_user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);
ALTER TABLE `system_user` MODIFY `user_id` INT(11) AUTO_INCREMENT;

--
-- Indexes for table `time_schedule`
--
ALTER TABLE `time_schedule`
  ADD PRIMARY KEY (`schedule_id`),
  ADD KEY `class_detail_id` (`class_detail_id`),
  ADD KEY `set_id` (`set_id`),
  ADD KEY `room_id` (`room_id`);
ALTER TABLE `time_schedule` MODIFY `schedule_id` INT(11) AUTO_INCREMENT;


--
-- Indexes for table `tutor`
--
ALTER TABLE `tutor`
  ADD PRIMARY KEY (`tutor_id`),
  ADD KEY `user_id` (`user_id`);
ALTER TABLE `tutor` MODIFY `tutor_id` INT(11) AUTO_INCREMENT;

--
-- AUTO_INCREMENT for dumped tables
--

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_attendance_class_session` FOREIGN KEY (`session_id`) REFERENCES `class_session` (`session_id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_room`
--
ALTER TABLE `chat_room`
  ADD CONSTRAINT `fk_chat_room_created_by` FOREIGN KEY (`created_by`) REFERENCES `system_user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_room_member`
--
ALTER TABLE `chat_room_member`
  ADD CONSTRAINT `fk_chat_room` FOREIGN KEY (`chat_room_id`) REFERENCES `chat_room` (`chat_room_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_room_user` FOREIGN KEY (`user_id`) REFERENCES `system_user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `class`
--
ALTER TABLE `class`
  ADD CONSTRAINT `fk_class_tutor` FOREIGN KEY (`tutor_id`) REFERENCES `tutor` (`tutor_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_class_subject` FOREIGN KEY (`subject_id`) REFERENCES `subject` (`subject_id`) ON DELETE CASCADE;

--
-- Constraints for table `class_detail`
--
ALTER TABLE `class_detail`
  ADD CONSTRAINT `fk_class_detail_class` FOREIGN KEY (`class_id`) REFERENCES `class` (`class_id`) ON DELETE CASCADE;

--
-- Constraints for table `class_enrollment`
--
ALTER TABLE `class_enrollment`
  ADD CONSTRAINT `fk_enrollment_package_set` FOREIGN KEY (`set_id`) REFERENCES `schedule_package_set` (`set_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_enrollment_class` FOREIGN KEY (`class_detail_id`) REFERENCES `class_detail` (`class_detail_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_enrollment_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `class_session`
--
ALTER TABLE `class_session`
  ADD CONSTRAINT `fk_class_session_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `time_schedule` (`schedule_id`) ON DELETE CASCADE;


--
-- Constraints for table `evaluationanswerlog`
--
ALTER TABLE `evaluationanswerlog`
  ADD CONSTRAINT `fk_evaluationanswerlog_result` FOREIGN KEY (`result_id`) REFERENCES `studentevaluationresult` (`result_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_evaluationanswerlog_qeustion` FOREIGN KEY (`question_id`) REFERENCES `evaluationquestion` (`question_id`) ON DELETE CASCADE;

--
-- Constraints for table `evaluationquestion`
--
ALTER TABLE `evaluationquestion`
  ADD CONSTRAINT `fk_evaluationquestion_test` FOREIGN KEY (`test_id`) REFERENCES `evaluation_test` (`test_id`) ON DELETE CASCADE;

--
-- Constraints for table `evaluation_test`
--
ALTER TABLE `evaluation_test`
  ADD CONSTRAINT `fk_evaluation_test_upload` FOREIGN KEY (`upload_id`) REFERENCES `evaluationupload` (`upload_id`) ON DELETE CASCADE;

--
-- Constraints for table `evaluation_metrics`
--
ALTER TABLE `evaluation_metrics`
  ADD CONSTRAINT `fk_evaluation_metrics_homework` FOREIGN KEY (`homework_id`) REFERENCES `homework` (`homework_id`) ON DELETE CASCADE;

--
-- Constraints for table `message`
--
ALTER TABLE `message`
  ADD CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `system_user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `service_enrollment`
--
ALTER TABLE `service_enrollment`
  ADD CONSTRAINT `fk_service_enrollment_service` FOREIGN KEY (`service_id`) REFERENCES `other_service` (`service_id`) ON DELETE CASCADE, 
  ADD CONSTRAINT `fk_service_enrollment_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `other_service_attendance`
--
ALTER TABLE `other_service_attendance`
  ADD CONSTRAINT `fk_other_service_attendance_session` FOREIGN KEY (`session_id`) REFERENCES `other_service_session` (`session_id`) ON DELETE CASCADE, 
  ADD CONSTRAINT `fk_other_service_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `other_service_session`
--
ALTER TABLE `other_service_session`
  ADD CONSTRAINT `fk_other_service_session_service` FOREIGN KEY (`service_id`) REFERENCES `other_service` (`service_id`) ON DELETE CASCADE, 
  ADD CONSTRAINT `fk_other_service_session_tutor` FOREIGN KEY (`tutor_id`) REFERENCES `tutor` (`tutor_id`) ON DELETE CASCADE;

--
-- Constraints for table `parent`
--
ALTER TABLE `parent`
  ADD CONSTRAINT `parent_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `system_user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `fk_payment_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_detail`
--
ALTER TABLE `payment_detail`
  ADD CONSTRAINT `fk_payment_detail_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`payment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payment_detail_class_enrollment` FOREIGN KEY (`class_enrollment_id`) REFERENCES `class_enrollment` (`class_enrollment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payment_detail_service` FOREIGN KEY (`service_id`) REFERENCES `other_service` (`service_id`) ON DELETE CASCADE;

--
-- Constraints for table `schedule_package`
--
ALTER TABLE `schedule_package`
  ADD CONSTRAINT `fk_schedule_package` FOREIGN KEY (`edu_lvl_id`) REFERENCES `education_level` (`edu_lvl_id`) ON DELETE CASCADE;

--
-- Constraints for table `schedule_package`
--
ALTER TABLE `schedule_package_set`
  ADD CONSTRAINT `fk_schedule_package_set` FOREIGN KEY (`package_id`) REFERENCES `schedule_package` (`package_id`) ON DELETE CASCADE;

--
-- Constraints for table `package_set_detail`
--
ALTER TABLE `package_set_detail`
  ADD CONSTRAINT `fk_package_set_detail_package_set` FOREIGN KEY (`set_id`) REFERENCES `schedule_package_set` (`set_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_package_set_detail_class_detail` FOREIGN KEY (`class_detail_id`) REFERENCES `class_detail` (`class_detail_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_package_set_detail_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE;

--
-- Constraints for table `submission`
--
ALTER TABLE `submission`
  ADD CONSTRAINT `fk_submission_homework` FOREIGN KEY (`homework_id`) REFERENCES `homework` (`homework_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_submission_student` FOREIGN KEY (`student_id`) REFERENCES `system_user` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `subject`
--
ALTER TABLE `subject`
  ADD CONSTRAINT `fk_subject_edu_lvl` FOREIGN KEY (`edu_lvl_id`) REFERENCES `education_level` (`edu_lvl_id`) ON DELETE CASCADE;

--
-- Constraints for table `student`
--
ALTER TABLE `student`
  ADD CONSTRAINT `student_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `system_user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `parent` (`parent_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_ibfk_3` FOREIGN KEY (`edu_lvl_id`) REFERENCES `education_level` (`edu_lvl_id`);

--
-- Constraints for table `studentevaluationresult`
--
ALTER TABLE `studentevaluationresult`
  ADD CONSTRAINT `fk_studentevaluationresult_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_studentevaluationresult_test` FOREIGN KEY (`test_id`) REFERENCES `evaluation_test` (`test_id`) ON DELETE CASCADE;

--
-- Constraints for table `time_schedule`
--
ALTER TABLE `time_schedule`
  ADD CONSTRAINT `fk_time_schedule_class_detail` FOREIGN KEY (`class_detail_id`) REFERENCES `class_detail` (`class_detail_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_time_schedule_set` FOREIGN KEY (`set_id`) REFERENCES `schedule_package_set` (`set_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_time_schedule_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`) ON DELETE CASCADE;

--
-- Constraints for table `tutor`
--
ALTER TABLE `tutor`
  ADD CONSTRAINT `tutor_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `system_user` (`user_id`) ON DELETE CASCADE;
COMMIT;

--
-- Dumping data for table `discount_metric`
--
INSERT INTO `discount_metric` (`num_of_enrolment`, `discount_amt`)
VALUES
(5, 5.00),
(6, 7.50),
(7, 10.00),
(8, 12.50),
(10, 15.00);

--
-- Dumping data for table `room`
--
INSERT INTO `room` (`name`, `room_type`, `max_capacity`, `status`) VALUES
('Room A', '1', 15, '1'),
('Room B', '1', 20, '1'),
('Room C', '2', 30, '1'),
('Room D', '3', 40, '1'),
('Room E', '3', 50, '1');

--
-- Dumping data for table `education_level`

--
INSERT INTO `education_level` (`name`, `description`, `status`) VALUES
('None', 'No formal education level', '1'),
('Primary 1', 'Primary Year 1', '1'),
('Primary 2', 'Primary Year 2', '1'),
('Primary 3', 'Primary Year 3', '1'),
('Primary 4', 'Primary Year 4', '1'),
('Primary 5', 'Primary Year 5', '1'),
('Primary 6', 'Primary Year 6', '1'),
('Secondary 1', 'Secondary Year 1', '1'),
('Secondary 2', 'Secondary Year 2', '1'),
('Secondary 3', 'Secondary Year 3', '1'),
('Secondary 4', 'Secondary Year 4', '1'),
('Secondary 5', 'Secondary Year 5', '1');

--
-- Dumping data for table `system_user`
--
INSERT INTO `system_user` (`name`, `email`, `password`, `ic_no`, `gender`, `dob`, `address`, `status`, `type`, `profile_pic`) VALUES
('Kengloon', 'kengloons@gmail.com', 'scrypt:32768:8:1$RYssgIBzaGrchqSH$abb5fe6467c9a8e9c81a828d2c0786673d704db357520ce0ef0840c61ac1555f5c7d466e5c07c2807d95c58ef2a220f08521b053450c22be285807aacde001d1', NULL, 'M', NULL, '17,Jalan Bayu 4, Taman Tun Teja, Desa Sri Bayu, 48000, Rawang, Selangor', '1', '', 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zed_0.jpg'),
('kengloon123', 'kid2dingzed@gmail.com', 'scrypt:32768:8:1$RYssgIBzaGrchqSH$abb5fe6467c9a8e9c81a828d2c0786673d704db357520ce0ef0840c61ac1555f5c7d466e5c07c2807d95c58ef2a220f08521b053450c22be285807aacde001d1', NULL, 'M', NULL, NULL, '1', 'parent', NULL),
('kengloon', '123@gmail.com', 'scrypt:32768:8:1$aAbAVmfakDC5xfOj$4a3a037e8102f7ef620bbedcfc88ed9ab6a3f0991806f6b192b3a5477e348b71f99e8cd4fae4ade774e9f43b4647550bb401896c075ec49421054e12b0e230a3', NULL, 'M', NULL, NULL, '1', 'parent', NULL),
('kengloons', 'kiddingzed@gmail.con', 'scrypt:32768:8:1$qTUw8LGpZz88eBb1$b44fe3122aadf2a7b17bca494bd9c9d34b142e7d87f45b4094d52906413c7a105e2948d0a5bff80ae41cd4858fb607672eb56611101615c24a5bdcf072634ef1', NULL, 'M', NULL, NULL, '1', 'parent', NULL),
('sia', 'kiddingzed@gmail.com', 'scrypt:32768:8:1$aa3X3xZX305DAju1$d1d117fa3fda34c63748965c9c2473f8ae2a3ee7d5a84f9bdbefd0944ceb3de433c778801d18ac9e319979036ae9ca4c81a84ca52c2a0bd442a7c9a1916d26e4', NULL, 'M', NULL, NULL, '1', 'parent', NULL),
('123', '123456@gmail.com', 'scrypt:32768:8:1$UsKdjq3A04fEf8Z7$2ee81cb65a58fa5505199c6e0e6d7cec3e64f0c7b0805b7be84c2208056047ebf883c051edd4043e844613951d75e71160adb87610d07a4e1cea677b0370733f', NULL, 'M', NULL, NULL, '1', 'parent', NULL),
('Sia Keng Loon', '1234@gmail.com', 'scrypt:32768:8:1$UpV2fS2tI6qUAz6Y$7bee15acf3acc65a1fddc55368e3cff12a0c1f509a47a624b9bc14d6d9e21e1eec3f394247f5ab64572d2005f6f5c198743507e85cb0013eecade9dc3718d597', '040803101793', 'M', '2025-10-19', NULL, '1', 'student', NULL),
('test123', 'test123@gmail.com', 'scrypt:32768:8:1$9JMMZKSDa3bbA9NT$c831aaaf4b6f70b19aedd007913bf7806d77bb2fc976c25b48a3d2dbabb0bf2eb56743779c82b8689e9c5a67f69dc5b34e78c5e8a0a1c77a837d608e6c4d8b43', '040803101793', 'M', '2025-10-19', NULL, '1', 'student', NULL),

('Alice Tan', 'alice.tan@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '990101-14-5678', 'F', '1999-01-01', '12 Jalan Merdeka, KL', '1', 'parent', NULL),
('Brian Lim', 'brian.lim@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '850212-10-2233', 'M', '1985-02-12', '24 Taman Desa, KL', '1', 'parent', NULL),
('Catherine Ong', 'catherine.ong@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '920314-08-4411', 'F', '1992-03-14', '8 Jalan Setia, PJ', '1', 'parent', NULL),
('David Lee', 'david.lee@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '890405-07-9011', 'M', '1989-04-05', '5 Jalan Bunga Raya, KL', '1', 'parent', NULL),
('Elaine Goh', 'elaine.goh@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '950523-10-4432', 'F', '1995-05-23', '66 Jalan Bahagia, KL', '1', 'parent', NULL),

('Frank Yong', 'frank.yong@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '080101-14-4567', 'M', '2008-01-01', '12 Jalan Merdeka, KL', '1', 'student', NULL),
('Grace Tan', 'grace.tan@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '090212-10-7788', 'F', '2009-02-12', '24 Taman Desa, KL', '1', 'student', NULL),
('Henry Lim', 'henry.lim@example.com', 'scrypt:32768:8:1$RYssgIBzaGrchqSH$abb5fe6467c9a8e9c81a828d2c0786673d704db357520ce0ef0840c61ac1555f5c7d466e5c07c2807d95c58ef2a220f08521b053450c22be285807aacde001d1', '100314-08-3321', 'M', '2010-03-14', '8 Jalan Setia, PJ', '1', 'student', NULL),
('Ivy Lee', 'ivy.lee@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '110405-07-6642', 'F', '2011-04-05', '5 Jalan Bunga Raya, KL', '1', 'student', NULL),
('Jack Goh', 'jack.goh@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '120523-10-9988', 'M', '2012-05-23', '66 Jalan Bahagia, KL', '1', 'student', NULL),

('Kelly Wong', 'kelly.wong@example.com', 'scrypt:32768:8:1$RYssgIBzaGrchqSH$abb5fe6467c9a8e9c81a828d2c0786673d704db357520ce0ef0840c61ac1555f5c7d466e5c07c2807d95c58ef2a220f08521b053450c22be285807aacde001d1', '880101-14-1111', 'F', '1988-01-01', '10 Jalan Aman, KL', '1', 'tutor', NULL),
('Louis Tan', 'louis.tan@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '870212-10-2222', 'M', '1987-02-12', '77 Taman Impian, PJ', '1', 'tutor', NULL),
('Melissa Chong', 'melissa.chong@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '900314-08-3333', 'F', '1990-03-14', '88 Jalan Ria, KL', '1', 'tutor', NULL),
('Nathan Low', 'nathan.low@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '890405-07-4444', 'M', '1989-04-05', '99 Jalan Harmoni, KL', '1', 'tutor', NULL),
('Olivia Teh', 'olivia.teh@example.com', '$2b$12$KIXz4Zy8U/8jV0.8FdYCAuQWkNwTezOIR4r6dYfZkNrmc0Ty8DHee', '910523-10-5555', 'F', '1991-05-23', '100 Jalan Bahagia, KL', '1', 'tutor', NULL);


--
-- Dumping data for table `tutor`
--
INSERT INTO `tutor` (`user_id`, `tel_no`, `age`, `position`, `salary`) VALUES
(19, '0165566778', 37, '1', 4200.00),
(20, '0178899001', 38, '1', 4500.00),
(21, '0182233445', 35, '2', 4300.00),
(22, '0196677889', 36, '2', 4100.00),
(23, '0119988776', 34, '2', 4000.00);

--
-- Dumping data for table `parent`
--
INSERT INTO `parent` (`user_id`, `tel_no`, `occupation`) VALUES
(1, '+6011-64580073', 'Doctor'),
(2, '+6011-64580073', 'N/A'),
(3, '+6011-64580073', 'N/A'),
(4, '+6011-64580073', 'N/A'),
(5, '+6011-64580073', 'N/A'),
(6, '+6011-64580073', 'N/A');

--
-- Dumping data for table `student`
--
INSERT INTO `student` (`student_id`, `user_id`, `parent_id`, `edu_lvl_id`, `age`, `payment_status`) VALUES
(1, 7, 1, 1, 15, '0'),
(2, 8, 3, 2, 12, '0'),
(3, 16, 2, 4, 15, '0'),
(4, 17, 4, 5, 14, '1'),
(5, 18, 5, 6, 13, '0');

--
-- Dumping data for table `chat_room`
--
INSERT INTO `chat_room` (`room_name`, `room_type`, `created_by`, `created_datetime`) VALUES
('Chat - Kelly Wong & Alice Tan', '1', 19, '2025-01-10 09:00:00'),
('Chat - Louis Tan & Brian Lim', '1', 20, '2025-01-10 10:00:00'),
('Chat - Melissa Chong & Catherine Ong', '1', 21, '2025-01-10 11:00:00'),
('Chat - Nathan Low & David Lee', '1', 22, '2025-01-10 12:00:00'),
('Chat - Olivia Teh & Elaine Goh', '1', 23, '2025-01-10 13:00:00');

--
-- Dumping data for table `chat_room_member`
--
INSERT INTO `chat_room_member` (`chat_room_id`, `user_id`, `joined_datetime`, `role`) VALUES
(1, 19, '2025-01-10 09:00:00', '1'),
(1, 9,  '2025-01-10 09:00:00', '2'),

(2, 20, '2025-01-10 10:00:00', '1'),
(2, 10, '2025-01-10 10:00:00', '2'),

(3, 21, '2025-01-10 11:00:00', '1'),
(3, 11, '2025-01-10 11:00:00', '2'),

(4, 22, '2025-01-10 12:00:00', '1'),
(4, 12, '2025-01-10 12:00:00', '2'),

(5, 23, '2025-01-10 13:00:00', '1'),
(5, 13, '2025-01-10 13:00:00', '2');

--
-- Dumping data for table `message`
--
INSERT INTO `message` (`chat_room_id`, `sender_id`, `content`, `send_datetime`, `read_by`) VALUES
-- Chat Room 1
(1, 19, 'Hello Alice, how is your child doing in class?', '2025-01-10 09:10:00', JSON_ARRAY(9)),
(1, 9, 'Hi Ms. Kelly, he’s doing well, thank you!', '2025-01-10 09:15:00', JSON_ARRAY(19)),
(1, 19, 'Great! We’ll continue focusing on math this week.', '2025-01-10 09:20:00', JSON_ARRAY(9)),
(1, 9, 'Sounds good. Appreciate your effort!', '2025-01-10 09:25:00', JSON_ARRAY(19)),
(1, 19, 'Thank you, see you next week!', '2025-01-10 09:30:00', JSON_ARRAY(9)),
(1, 9, 'See you, Ms. Kelly!', '2025-01-10 09:35:00', JSON_ARRAY(19)),

-- Chat Room 2
(2, 20, 'Hi Brian, Louis here from EazeTuition.', '2025-01-10 10:05:00', JSON_ARRAY(10)),
(2, 10, 'Hi Mr. Louis, good morning.', '2025-01-10 10:07:00', JSON_ARRAY(20)),
(2, 20, 'Your daughter has improved a lot!', '2025-01-10 10:15:00', JSON_ARRAY(10)),
(2, 10, 'That’s wonderful to hear.', '2025-01-10 10:17:00', JSON_ARRAY(20)),
(2, 20, 'Keep encouraging her at home too.', '2025-01-10 10:20:00', JSON_ARRAY(10)),
(2, 10, 'Sure thing, thanks!', '2025-01-10 10:25:00', JSON_ARRAY(20)),

-- Chat Room 3
(3, 21, 'Hi Catherine, I wanted to discuss Melissa’s progress.', '2025-01-10 11:10:00', JSON_ARRAY(11)),
(3, 11, 'Hi Ms. Melissa, sure.', '2025-01-10 11:12:00', JSON_ARRAY(21)),
(3, 21, 'She’s been very active in class.', '2025-01-10 11:18:00', JSON_ARRAY(11)),
(3, 11, 'That’s great! She enjoys your class a lot.', '2025-01-10 11:22:00', JSON_ARRAY(21)),
(3, 21, 'I’m glad to hear that!', '2025-01-10 11:25:00', JSON_ARRAY(11)),
(3, 11, 'Thank you for the update.', '2025-01-10 11:28:00', JSON_ARRAY(21)),

-- Chat Room 4
(4, 22, 'Good afternoon David, about your son’s attendance...', '2025-01-10 12:10:00', JSON_ARRAY(12)),
(4, 12, 'Hi Nathan, yes I saw the note.', '2025-01-10 12:12:00', JSON_ARRAY(22)),
(4, 22, 'We’ll give him an extra practice session next week.', '2025-01-10 12:18:00', JSON_ARRAY(12)),
(4, 12, 'Appreciate that. Thanks for the support.', '2025-01-10 12:22:00', JSON_ARRAY(22)),
(4, 22, 'No problem, glad to help.', '2025-01-10 12:25:00', JSON_ARRAY(12)),
(4, 12, 'See you at the next session!', '2025-01-10 12:30:00', JSON_ARRAY(22)),

-- Chat Room 5
(5, 23, 'Hi Elaine, just checking in about Jack’s homework.', '2025-01-10 13:10:00', JSON_ARRAY(13)),
(5, 13, 'Hi Ms. Olivia, he’s been doing fine.', '2025-01-10 13:12:00', JSON_ARRAY(23)),
(5, 23, 'Good to hear! Keep encouraging him.', '2025-01-10 13:18:00', JSON_ARRAY(13)),
(5, 13, 'Will do, thank you.', '2025-01-10 13:22:00', JSON_ARRAY(23)),
(5, 23, 'Let’s review his progress next week.', '2025-01-10 13:25:00', JSON_ARRAY(13)),
(5, 13, 'Sure thing, have a great day!', '2025-01-10 13:28:00', JSON_ARRAY(23));

--
-- Dumping data for table `subject`
--
INSERT INTO `subject` (`edu_lvl_id`, `name`, `description`, `normal_class_fee`, `focus_class_fee`, `material_fee`, `status`) VALUES
(2, 'Mathematics', 'Basic and advanced arithmetic and algebra topics.', 150.00, 200.00, 30.00, '1'),
(3, 'Science', 'Introduction to physics, chemistry, and biology.', 160.00, 210.00, 25.00, '1'),
(4, 'English', 'Grammar, writing, and comprehension improvement.', 140.00, 190.00, 20.00, '1'),
(5, 'History', 'World and Malaysian history topics for secondary level.', 130.00, 180.00, 15.00, '1'),
(6, 'Art', 'Creative drawing, painting, and design fundamentals.', 120.00, 170.00, 10.00, '1');


INSERT INTO `subject` (`edu_lvl_id`, `name`, `description`, `normal_class_fee`, `focus_class_fee`, `material_fee`, `status`) VALUES
(2, 'Mathematics - Algebra I', 'Foundational algebra for beginners.', 150.00, 200.00, 20.00, '1'),
(2, 'Mathematics - Geometry Basics', 'Understanding lines, angles and shapes.', 150.00, 200.00, 20.00, '1'),
(2, 'Science - Lab Skills Intro', 'Observation, measurement and simple experiments.', 160.00, 210.00, 25.00, '1'),
(2, 'Science - Earth & Space', 'Introduction to Earth systems and astronomy.', 160.00, 210.00, 20.00, '1'),
(2, 'English - Vocabulary Builder I', 'Enhancing word usage for Level 2.', 140.00, 190.00, 15.00, '1'),
(2, 'English - Reading Skills I', 'Basic comprehension and analysis.', 140.00, 190.00, 15.00, '1'),
(2, 'History - Early Civilizations', 'Understanding ancient societies.', 130.00, 180.00, 15.00, '1'),
(2, 'History - Malaysian Heritage I', 'Local culture and traditions.', 130.00, 180.00, 15.00, '1'),
(2, 'Art - Drawing Basics', 'Lines, shapes and shading.', 120.00, 170.00, 10.00, '1'),
(2, 'Art - Creative Sketching I', 'Fundamental sketching techniques.', 120.00, 170.00, 10.00, '1');
INSERT INTO `subject` (`edu_lvl_id`, `name`, `description`, `normal_class_fee`, `focus_class_fee`, `material_fee`, `status`) VALUES
(3, 'Mathematics - Algebra II', 'Intermediate algebra skills.', 160.00, 210.00, 25.00, '1'),
(3, 'Mathematics - Statistics Intro', 'Basic data and probability.', 160.00, 210.00, 25.00, '1'),
(3, 'Science - Biology Basics', 'Cells, plants and animals.', 165.00, 215.00, 20.00, '1'),
(3, 'Science - Chemistry Essentials', 'Atoms, compounds and reactions.', 165.00, 215.00, 25.00, '1'),
(3, 'English - Grammar Skills I', 'Fundamentals of proper sentence structure.', 145.00, 195.00, 20.00, '1'),
(3, 'English - Writing Skills I', 'Guided writing and expression.', 145.00, 195.00, 20.00, '1'),
(3, 'History - Asian Dynasties', 'Historical empires in Asia.', 135.00, 185.00, 15.00, '1'),
(3, 'History - World Civilizations I', 'Overview of early world cultures.', 135.00, 185.00, 15.00, '1'),
(3, 'Art - Watercolor Basics', 'Techniques for transparency and wash.', 125.00, 175.00, 15.00, '1'),
(3, 'Art - Cartooning Basics', 'Simplified character drawing.', 125.00, 175.00, 15.00, '1');
INSERT INTO `subject` (`edu_lvl_id`, `name`, `description`, `normal_class_fee`, `focus_class_fee`, `material_fee`, `status`) VALUES
(4, 'Mathematics - Trigonometry Intro', 'Triangles and trigonometric ratios.', 160.00, 210.00, 25.00, '1'),
(4, 'Mathematics - Problem Solving I', 'Logic and structured reasoning.', 170.00, 220.00, 30.00, '1'),
(4, 'Science - Physics Fundamentals', 'Force, motion and basic energy.', 170.00, 220.00, 25.00, '1'),
(4, 'Science - Lab Skills II', 'Measuring, experimentation and reporting.', 170.00, 220.00, 30.00, '1'),
(4, 'English - Literature Basics', 'Themes, characters and analysis.', 150.00, 200.00, 25.00, '1'),
(4, 'English - Public Speaking I', 'Confidence and articulation.', 150.00, 200.00, 25.00, '1'),
(4, 'History - Medieval Europe', 'Feudalism and cultural shifts.', 140.00, 190.00, 20.00, '1'),
(4, 'History - Colonial Era Intro', 'Imperialism and migration.', 140.00, 190.00, 20.00, '1'),
(4, 'Art - Acrylic Painting Intro', 'Textures and color mixing.', 130.00, 180.00, 20.00, '1'),
(4, 'Art - Creative Sketching II', 'Advanced sketching improvement.', 130.00, 180.00, 20.00, '1');
INSERT INTO `subject` (`edu_lvl_id`, `name`, `description`, `normal_class_fee`, `focus_class_fee`, `material_fee`, `status`) VALUES
(5, 'Mathematics - Exam Workshop', 'Exam-style problem solving.', 170.00, 220.00, 30.00, '1'),
(5, 'Mathematics - Olympiad Intro', 'Competition-style training.', 180.00, 230.00, 35.00, '1'),
(5, 'Science - Environmental Science II', 'Ecosystems and sustainability.', 165.00, 215.00, 25.00, '1'),
(5, 'Science - Experimental Inquiry II', 'Hands-on investigations.', 175.00, 225.00, 30.00, '1'),
(5, 'English - Writing Skills II', 'Advanced writing and structure.', 150.00, 200.00, 25.00, '1'),
(5, 'English - Reading Comprehension II', 'Analytical reading skills.', 145.00, 195.00, 20.00, '1'),
(5, 'History - Modern History', 'From industrial age to today.', 140.00, 190.00, 25.00, '1'),
(5, 'History - Source Analysis I', 'Primary & secondary source skills.', 145.00, 195.00, 25.00, '1'),
(5, 'Art - Digital Illustration', 'Drawing using digital tools.', 135.00, 185.00, 25.00, '1'),
(5, 'Art - Character Design I', 'Shapes, forms and stylization.', 135.00, 185.00, 25.00, '1');
INSERT INTO `subject` (`edu_lvl_id`, `name`, `description`, `normal_class_fee`, `focus_class_fee`, `material_fee`, `status`) VALUES
(6, 'Mathematics - Advanced Algebra', 'Deep dive into algebraic structures.', 180.00, 230.00, 30.00, '1'),
(6, 'Mathematics - Applied Statistics', 'Real-world data interpretation.', 180.00, 230.00, 30.00, '1'),
(6, 'Science - Physics Applications', 'Energy, waves and machinery.', 175.00, 225.00, 30.00, '1'),
(6, 'Science - Chemistry Applied', 'Chemical reactions in daily life.', 175.00, 225.00, 30.00, '1'),
(6, 'English - Literature Analysis II', 'Deeper reading and critique.', 150.00, 200.00, 25.00, '1'),
(6, 'English - Speech & Debate', 'Argument, structure and delivery.', 155.00, 205.00, 25.00, '1'),
(6, 'History - Asian Empires II', 'Rise and fall of dynasties.', 140.00, 190.00, 20.00, '1'),
(6, 'History - Global Conflicts', 'Studies of major wars and causes.', 145.00, 195.00, 25.00, '1'),
(6, 'Art - Portfolio Workshop', 'Preparing a polished portfolio.', 140.00, 190.00, 30.00, '1'),
(6, 'Art - Perspective & Composition II', 'Complex compositions.', 140.00, 190.00, 25.00, '1');


--
-- Dumping data for table `class`
--
INSERT INTO `class` (`tutor_id`, `subject_id`, `class_type`, `time_per_week`, `duration`, `is_open_for_schedule`, `status`) VALUES
(1, 1, 'N', 1, 120, '1', '1'),
(2, 2, 'F', 1, 180, '1', '1'),
(3, 3, 'N', 1, 120, '1', '1'),
(4, 4, 'F', 1, 120, '1', '1'),
(5, 5, 'N', 1, 60, '1', '1');

--
-- Dumping data for table `class_detail`
--
INSERT INTO `class_detail` (`class_id`, `day_of_week`, `start_time`, `end_time`, `status`) VALUES
(1, '1', '09:00:00', '11:00:00', '1'),
(2, '1', '10:00:00', '13:00:00', '1'),
(3, '3', '14:00:00', '16:00:00', '1'),
(4, '4', '15:00:00', '19:00:00', '1'),
(5, '5', '08:00:00', '09:00:00', '1');


--
-- Dumping data for table `schedule_package`
--
INSERT INTO `schedule_package` (`edu_lvl_id`, `name`, `year`, `created_datetime`, `is_open_for_enrollment`, `status`) VALUES
(2, 'Level 2 Package 2025', 2025, '2024-12-10 09:30:00', '1', '1'),
(3, 'Level 3 Package 2025', 2025, '2024-12-10 10:30:00', '1', '1'),
(4, 'Level 4 Package 2025', 2025, '2024-12-10 11:30:00', '1', '1'),
(5, 'Level 5 Package 2025', 2025, '2024-12-10 12:30:00', '1', '1'),
(6, 'Level 6 Package 2025', 2025, '2024-12-10 13:30:00', '1', '1');

INSERT INTO `schedule_package_set` (`package_id`, `name`, `created_datetime`) VALUES
(1, 'Set A', '2024-12-10 09:30:00'),
(2, 'Set A', '2024-12-10 10:30:00'),
(3, 'Set A', '2024-12-10 11:30:00'),
(4, 'Set A', '2024-12-10 12:30:00'),
(5, 'Set A', '2024-12-10 13:30:00');

--
-- Dumping data for table `package_set_detail`
--
INSERT INTO `package_set_detail` (`set_id`, `class_detail_id`, `room_id`, `max_capacity`) VALUES
-- Class 1 schedules (schedule_id 1..6) -> package 1
(1,  1, 1, 20),

-- Class 2 schedules (schedule_id 7..12) -> package 2
(2,  2, 2, 15),

-- Class 3 schedules (schedule_id 13..18) -> package 3
(3, 3, 3, 25),

-- Class 4 schedules (schedule_id 19..24) -> package 4
(4, 4, 4, 10),

-- Class 5 schedules (schedule_id 25..30) -> package 5
(5, 5, 5, 30);


--
-- Dumping data for table `time_schedule`
--
INSERT INTO `time_schedule`
(`class_detail_id`, `set_id`, `room_id`, `start_datetime`, `end_datetime`, `type`, `student_enroll`, `status`) VALUES
-- Class 1 (Mon, 09:00–11:00), set_id=1, room_id=2, enroll pattern: [18,19,20,17,18,19]
(1, 1, 2, '2025-01-06 09:00:00', '2025-01-06 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-01-13 09:00:00', '2025-01-13 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-01-20 09:00:00', '2025-01-20 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-01-27 09:00:00', '2025-01-27 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-02-03 09:00:00', '2025-02-03 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-02-10 09:00:00', '2025-02-10 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-02-17 09:00:00', '2025-02-17 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-02-24 09:00:00', '2025-02-24 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-03-03 09:00:00', '2025-03-03 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-03-10 09:00:00', '2025-03-10 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-03-17 09:00:00', '2025-03-17 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-03-24 09:00:00', '2025-03-24 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-03-31 09:00:00', '2025-03-31 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-04-07 09:00:00', '2025-04-07 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-04-14 09:00:00', '2025-04-14 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-04-21 09:00:00', '2025-04-21 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-04-28 09:00:00', '2025-04-28 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-05-05 09:00:00', '2025-05-05 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-05-12 09:00:00', '2025-05-12 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-05-19 09:00:00', '2025-05-19 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-05-26 09:00:00', '2025-05-26 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-06-02 09:00:00', '2025-06-02 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-06-09 09:00:00', '2025-06-09 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-06-16 09:00:00', '2025-06-16 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-06-23 09:00:00', '2025-06-23 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-06-30 09:00:00', '2025-06-30 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-07-07 09:00:00', '2025-07-07 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-07-14 09:00:00', '2025-07-14 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-07-21 09:00:00', '2025-07-21 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-07-28 09:00:00', '2025-07-28 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-08-04 09:00:00', '2025-08-04 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-08-11 09:00:00', '2025-08-11 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-08-18 09:00:00', '2025-08-18 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-08-25 09:00:00', '2025-08-25 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-09-01 09:00:00', '2025-09-01 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-09-08 09:00:00', '2025-09-08 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-09-15 09:00:00', '2025-09-15 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-09-22 09:00:00', '2025-09-22 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-09-29 09:00:00', '2025-09-29 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-10-06 09:00:00', '2025-10-06 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-10-13 09:00:00', '2025-10-13 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-10-20 09:00:00', '2025-10-20 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-10-27 09:00:00', '2025-10-27 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-11-03 09:00:00', '2025-11-03 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-11-10 09:00:00', '2025-11-10 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-11-17 09:00:00', '2025-11-17 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-11-24 09:00:00', '2025-11-24 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-12-01 09:00:00', '2025-12-01 11:00:00', '1', 17, '1'),
(1, 1, 2, '2025-12-08 09:00:00', '2025-12-08 11:00:00', '1', 18, '1'),
(1, 1, 2, '2025-12-15 09:00:00', '2025-12-15 11:00:00', '1', 19, '1'),
(1, 1, 2, '2025-12-22 09:00:00', '2025-12-22 11:00:00', '1', 20, '1'),
(1, 1, 2, '2025-12-29 09:00:00', '2025-12-29 11:00:00', '1', 17, '1'),

-- Class 2 (Tue, 10:00–13:00), set_id=2, room_id=1, enroll pattern: [12,14,13,15,15,14]
(2, 2, 1, '2025-01-07 10:00:00', '2025-01-07 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-01-14 10:00:00', '2025-01-14 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-01-21 10:00:00', '2025-01-21 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-01-28 10:00:00', '2025-01-28 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-02-04 10:00:00', '2025-02-04 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-02-11 10:00:00', '2025-02-11 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-02-18 10:00:00', '2025-02-18 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-02-25 10:00:00', '2025-02-25 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-03-04 10:00:00', '2025-03-04 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-03-11 10:00:00', '2025-03-11 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-03-18 10:00:00', '2025-03-18 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-03-25 10:00:00', '2025-03-25 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-04-01 10:00:00', '2025-04-01 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-04-08 10:00:00', '2025-04-08 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-04-15 10:00:00', '2025-04-15 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-04-22 10:00:00', '2025-04-22 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-04-29 10:00:00', '2025-04-29 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-05-06 10:00:00', '2025-05-06 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-05-13 10:00:00', '2025-05-13 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-05-20 10:00:00', '2025-05-20 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-05-27 10:00:00', '2025-05-27 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-06-03 10:00:00', '2025-06-03 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-06-10 10:00:00', '2025-06-10 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-06-17 10:00:00', '2025-06-17 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-06-24 10:00:00', '2025-06-24 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-07-01 10:00:00', '2025-07-01 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-07-08 10:00:00', '2025-07-08 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-07-15 10:00:00', '2025-07-15 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-07-22 10:00:00', '2025-07-22 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-07-29 10:00:00', '2025-07-29 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-08-05 10:00:00', '2025-08-05 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-08-12 10:00:00', '2025-08-12 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-08-19 10:00:00', '2025-08-19 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-08-26 10:00:00', '2025-08-26 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-09-02 10:00:00', '2025-09-02 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-09-09 10:00:00', '2025-09-09 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-09-16 10:00:00', '2025-09-16 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-09-23 10:00:00', '2025-09-23 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-09-30 10:00:00', '2025-09-30 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-10-07 10:00:00', '2025-10-07 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-10-14 10:00:00', '2025-10-14 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-10-21 10:00:00', '2025-10-21 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-10-28 10:00:00', '2025-10-28 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-11-04 10:00:00', '2025-11-04 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-11-11 10:00:00', '2025-11-11 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-11-18 10:00:00', '2025-11-18 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-11-25 10:00:00', '2025-11-25 13:00:00', '1', 15, '1'),
(2, 2, 1, '2025-12-02 10:00:00', '2025-12-02 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-12-09 10:00:00', '2025-12-09 13:00:00', '1', 12, '1'),
(2, 2, 1, '2025-12-16 10:00:00', '2025-12-16 13:00:00', '1', 14, '1'),
(2, 2, 1, '2025-12-23 10:00:00', '2025-12-23 13:00:00', '1', 13, '1'),
(2, 2, 1, '2025-12-30 10:00:00', '2025-12-30 13:00:00', '1', 15, '1'),


-- Class 3 (Wed 14:00–16:00, class_detail_id=3, set_id=3, room_id=3)
(3, 3, 3, '2025-01-01 14:00:00', '2025-01-01 16:00:00', '1', 20, '1'),
(3, 3, 3, '2025-01-08 14:00:00', '2025-01-08 16:00:00', '1', 21, '1'),
(3, 3, 3, '2025-01-15 14:00:00', '2025-01-15 16:00:00', '1', 22, '1'),
(3, 3, 3, '2025-01-22 14:00:00', '2025-01-22 16:00:00', '1', 23, '1'),
(3, 3, 3, '2025-01-29 14:00:00', '2025-01-29 16:00:00', '1', 24, '1'),
(3, 3, 3, '2025-02-05 14:00:00', '2025-02-05 16:00:00', '1', 25, '1'),
(3, 3, 3, '2025-02-12 14:00:00', '2025-02-12 16:00:00', '1', 26, '1'),
(3, 3, 3, '2025-02-19 14:00:00', '2025-02-19 16:00:00', '1', 27, '1'),
(3, 3, 3, '2025-02-26 14:00:00', '2025-02-26 16:00:00', '1', 28, '1'),
(3, 3, 3, '2025-03-05 14:00:00', '2025-03-05 16:00:00', '1', 29, '1'),
(3, 3, 3, '2025-03-12 14:00:00', '2025-03-12 16:00:00', '1', 30, '1'),
(3, 3, 3, '2025-03-19 14:00:00', '2025-03-19 16:00:00', '1', 31, '1'),
(3, 3, 3, '2025-03-26 14:00:00', '2025-03-26 16:00:00', '1', 32, '1'),
(3, 3, 3, '2025-04-02 14:00:00', '2025-04-02 16:00:00', '1', 33, '1'),
(3, 3, 3, '2025-04-09 14:00:00', '2025-04-09 16:00:00', '1', 34, '1'),
(3, 3, 3, '2025-04-16 14:00:00', '2025-04-16 16:00:00', '1', 35, '1'),
(3, 3, 3, '2025-04-23 14:00:00', '2025-04-23 16:00:00', '1', 36, '1'),
(3, 3, 3, '2025-04-30 14:00:00', '2025-04-30 16:00:00', '1', 37, '1'),
(3, 3, 3, '2025-05-07 14:00:00', '2025-05-07 16:00:00', '1', 38, '1'),
(3, 3, 3, '2025-05-14 14:00:00', '2025-05-14 16:00:00', '1', 39, '1'),
(3, 3, 3, '2025-05-21 14:00:00', '2025-05-21 16:00:00', '1', 40, '1'),
(3, 3, 3, '2025-05-28 14:00:00', '2025-05-28 16:00:00', '1', 41, '1'),
(3, 3, 3, '2025-06-04 14:00:00', '2025-06-04 16:00:00', '1', 42, '1'),
(3, 3, 3, '2025-06-11 14:00:00', '2025-06-11 16:00:00', '1', 43, '1'),
(3, 3, 3, '2025-06-18 14:00:00', '2025-06-18 16:00:00', '1', 44, '1'),
(3, 3, 3, '2025-06-25 14:00:00', '2025-06-25 16:00:00', '1', 45, '1'),
(3, 3, 3, '2025-07-02 14:00:00', '2025-07-02 16:00:00', '1', 46, '1'),
(3, 3, 3, '2025-07-09 14:00:00', '2025-07-09 16:00:00', '1', 47, '1'),
(3, 3, 3, '2025-07-16 14:00:00', '2025-07-16 16:00:00', '1', 48, '1'),
(3, 3, 3, '2025-07-23 14:00:00', '2025-07-23 16:00:00', '1', 49, '1'),
(3, 3, 3, '2025-07-30 14:00:00', '2025-07-30 16:00:00', '1', 50, '1'),
(3, 3, 3, '2025-08-06 14:00:00', '2025-08-06 16:00:00', '1', 51, '1'),
(3, 3, 3, '2025-08-13 14:00:00', '2025-08-13 16:00:00', '1', 52, '1'),
(3, 3, 3, '2025-08-20 14:00:00', '2025-08-20 16:00:00', '1', 53, '1'),
(3, 3, 3, '2025-08-27 14:00:00', '2025-08-27 16:00:00', '1', 54, '1'),
(3, 3, 3, '2025-09-03 14:00:00', '2025-09-03 16:00:00', '1', 55, '1'),
(3, 3, 3, '2025-09-10 14:00:00', '2025-09-10 16:00:00', '1', 56, '1'),
(3, 3, 3, '2025-09-17 14:00:00', '2025-09-17 16:00:00', '1', 57, '1'),
(3, 3, 3, '2025-09-24 14:00:00', '2025-09-24 16:00:00', '1', 58, '1'),
(3, 3, 3, '2025-10-01 14:00:00', '2025-10-01 16:00:00', '1', 59, '1'),
(3, 3, 3, '2025-10-08 14:00:00', '2025-10-08 16:00:00', '1', 60, '1'),
(3, 3, 3, '2025-10-15 14:00:00', '2025-10-15 16:00:00', '1', 61, '1'),
(3, 3, 3, '2025-10-22 14:00:00', '2025-10-22 16:00:00', '1', 62, '1'),
(3, 3, 3, '2025-10-29 14:00:00', '2025-10-29 16:00:00', '1', 63, '1'),
(3, 3, 3, '2025-11-05 14:00:00', '2025-11-05 16:00:00', '1', 64, '1'),
(3, 3, 3, '2025-11-12 14:00:00', '2025-11-12 16:00:00', '1', 65, '1'),
(3, 3, 3, '2025-11-19 14:00:00', '2025-11-19 16:00:00', '1', 66, '1'),
(3, 3, 3, '2025-11-26 14:00:00', '2025-11-26 16:00:00', '1', 67, '1'),
(3, 3, 3, '2025-12-03 14:00:00', '2025-12-03 16:00:00', '1', 68, '1'),
(3, 3, 3, '2025-12-10 14:00:00', '2025-12-10 16:00:00', '1', 69, '1'),
(3, 3, 3, '2025-12-17 14:00:00', '2025-12-17 16:00:00', '1', 70, '1'),
(3, 3, 3, '2025-12-24 14:00:00', '2025-12-24 16:00:00', '1', 71, '1'),
(3, 3, 3, '2025-12-31 14:00:00', '2025-12-31 16:00:00', '1', 72, '1'),

-- Class 4 (Thu 15:00–19:00, class_detail_id=4, set_id=4, room_id=1)
(4, 4, 1, '2025-01-02 15:00:00', '2025-01-02 19:00:00', '1', 9, '1'),
(4, 4, 1, '2025-01-09 15:00:00', '2025-01-09 19:00:00', '1', 10, '1'),
(4, 4, 1, '2025-01-16 15:00:00', '2025-01-16 19:00:00', '1', 11, '1'),
(4, 4, 1, '2025-01-23 15:00:00', '2025-01-23 19:00:00', '1', 12, '1'),
(4, 4, 1, '2025-01-30 15:00:00', '2025-01-30 19:00:00', '1', 13, '1'),
(4, 4, 1, '2025-02-06 15:00:00', '2025-02-06 19:00:00', '1', 14, '1'),
(4, 4, 1, '2025-02-13 15:00:00', '2025-02-13 19:00:00', '1', 15, '1'),
(4, 4, 1, '2025-02-20 15:00:00', '2025-02-20 19:00:00', '1', 16, '1'),
(4, 4, 1, '2025-02-27 15:00:00', '2025-02-27 19:00:00', '1', 17, '1'),
(4, 4, 1, '2025-03-06 15:00:00', '2025-03-06 19:00:00', '1', 18, '1'),
(4, 4, 1, '2025-03-13 15:00:00', '2025-03-13 19:00:00', '1', 19, '1'),
(4, 4, 1, '2025-03-20 15:00:00', '2025-03-20 19:00:00', '1', 20, '1'),
(4, 4, 1, '2025-03-27 15:00:00', '2025-03-27 19:00:00', '1', 21, '1'),
(4, 4, 1, '2025-04-03 15:00:00', '2025-04-03 19:00:00', '1', 22, '1'),
(4, 4, 1, '2025-04-10 15:00:00', '2025-04-10 19:00:00', '1', 23, '1'),
(4, 4, 1, '2025-04-17 15:00:00', '2025-04-17 19:00:00', '1', 24, '1'),
(4, 4, 1, '2025-04-24 15:00:00', '2025-04-24 19:00:00', '1', 25, '1'),
(4, 4, 1, '2025-05-01 15:00:00', '2025-05-01 19:00:00', '1', 26, '1'),
(4, 4, 1, '2025-05-08 15:00:00', '2025-05-08 19:00:00', '1', 27, '1'),
(4, 4, 1, '2025-05-15 15:00:00', '2025-05-15 19:00:00', '1', 28, '1'),
(4, 4, 1, '2025-05-22 15:00:00', '2025-05-22 19:00:00', '1', 29, '1'),
(4, 4, 1, '2025-05-29 15:00:00', '2025-05-29 19:00:00', '1', 30, '1'),
(4, 4, 1, '2025-06-05 15:00:00', '2025-06-05 19:00:00', '1', 31, '1'),
(4, 4, 1, '2025-06-12 15:00:00', '2025-06-12 19:00:00', '1', 32, '1'),
(4, 4, 1, '2025-06-19 15:00:00', '2025-06-19 19:00:00', '1', 33, '1'),
(4, 4, 1, '2025-06-26 15:00:00', '2025-06-26 19:00:00', '1', 34, '1'),
(4, 4, 1, '2025-07-03 15:00:00', '2025-07-03 19:00:00', '1', 35, '1'),
(4, 4, 1, '2025-07-10 15:00:00', '2025-07-10 19:00:00', '1', 36, '1'),
(4, 4, 1, '2025-07-17 15:00:00', '2025-07-17 19:00:00', '1', 37, '1'),
(4, 4, 1, '2025-07-24 15:00:00', '2025-07-24 19:00:00', '1', 38, '1'),
(4, 4, 1, '2025-07-31 15:00:00', '2025-07-31 19:00:00', '1', 39, '1'),
(4, 4, 1, '2025-08-07 15:00:00', '2025-08-07 19:00:00', '1', 40, '1'),
(4, 4, 1, '2025-08-14 15:00:00', '2025-08-14 19:00:00', '1', 41, '1'),
(4, 4, 1, '2025-08-21 15:00:00', '2025-08-21 19:00:00', '1', 42, '1'),
(4, 4, 1, '2025-08-28 15:00:00', '2025-08-28 19:00:00', '1', 43, '1'),
(4, 4, 1, '2025-09-04 15:00:00', '2025-09-04 19:00:00', '1', 44, '1'),
(4, 4, 1, '2025-09-11 15:00:00', '2025-09-11 19:00:00', '1', 45, '1'),
(4, 4, 1, '2025-09-18 15:00:00', '2025-09-18 19:00:00', '1', 46, '1'),
(4, 4, 1, '2025-09-25 15:00:00', '2025-09-25 19:00:00', '1', 47, '1'),
(4, 4, 1, '2025-10-02 15:00:00', '2025-10-02 19:00:00', '1', 48, '1'),
(4, 4, 1, '2025-10-09 15:00:00', '2025-10-09 19:00:00', '1', 49, '1'),
(4, 4, 1, '2025-10-16 15:00:00', '2025-10-16 19:00:00', '1', 50, '1'),
(4, 4, 1, '2025-10-23 15:00:00', '2025-10-23 19:00:00', '1', 51, '1'),
(4, 4, 1, '2025-10-30 15:00:00', '2025-10-30 19:00:00', '1', 52, '1'),
(4, 4, 1, '2025-11-06 15:00:00', '2025-11-06 19:00:00', '1', 53, '1'),
(4, 4, 1, '2025-11-13 15:00:00', '2025-11-13 19:00:00', '1', 54, '1'),
(4, 4, 1, '2025-11-20 15:00:00', '2025-11-20 19:00:00', '1', 55, '1'),
(4, 4, 1, '2025-11-27 15:00:00', '2025-11-27 19:00:00', '1', 56, '1'),
(4, 4, 1, '2025-12-04 15:00:00', '2025-12-04 19:00:00', '1', 57, '1'),
(4, 4, 1, '2025-12-11 15:00:00', '2025-12-11 19:00:00', '1', 58, '1'),
(4, 4, 1, '2025-12-18 15:00:00', '2025-12-18 19:00:00', '1', 59, '1'),
(4, 4, 1, '2025-12-25 15:00:00', '2025-12-25 19:00:00', '1', 60, '1'),

-- Class 5 (Fri 08:00–09:00, class_detail_id=5, set_id=5, room_id=3)
(5, 5, 3, '2025-01-03 08:00:00', '2025-01-03 09:00:00', '1', 25, '1'),
(5, 5, 3, '2025-01-10 08:00:00', '2025-01-10 09:00:00', '1', 26, '1'),
(5, 5, 3, '2025-01-17 08:00:00', '2025-01-17 09:00:00', '1', 27, '1'),
(5, 5, 3, '2025-01-24 08:00:00', '2025-01-24 09:00:00', '1', 28, '1'),
(5, 5, 3, '2025-01-31 08:00:00', '2025-01-31 09:00:00', '1', 29, '1'),
(5, 5, 3, '2025-02-07 08:00:00', '2025-02-07 09:00:00', '1', 30, '1'),
(5, 5, 3, '2025-02-14 08:00:00', '2025-02-14 09:00:00', '1', 31, '1'),
(5, 5, 3, '2025-02-21 08:00:00', '2025-02-21 09:00:00', '1', 32, '1'),
(5, 5, 3, '2025-02-28 08:00:00', '2025-02-28 09:00:00', '1', 33, '1'),
(5, 5, 3, '2025-03-07 08:00:00', '2025-03-07 09:00:00', '1', 34, '1'),
(5, 5, 3, '2025-03-14 08:00:00', '2025-03-14 09:00:00', '1', 35, '1'),
(5, 5, 3, '2025-03-21 08:00:00', '2025-03-21 09:00:00', '1', 36, '1'),
(5, 5, 3, '2025-03-28 08:00:00', '2025-03-28 09:00:00', '1', 37, '1'),
(5, 5, 3, '2025-04-04 08:00:00', '2025-04-04 09:00:00', '1', 38, '1'),
(5, 5, 3, '2025-04-11 08:00:00', '2025-04-11 09:00:00', '1', 39, '1'),
(5, 5, 3, '2025-04-18 08:00:00', '2025-04-18 09:00:00', '1', 40, '1'),
(5, 5, 3, '2025-04-25 08:00:00', '2025-04-25 09:00:00', '1', 41, '1'),
(5, 5, 3, '2025-05-02 08:00:00', '2025-05-02 09:00:00', '1', 42, '1'),
(5, 5, 3, '2025-05-09 08:00:00', '2025-05-09 09:00:00', '1', 43, '1'),
(5, 5, 3, '2025-05-16 08:00:00', '2025-05-16 09:00:00', '1', 44, '1'),
(5, 5, 3, '2025-05-23 08:00:00', '2025-05-23 09:00:00', '1', 45, '1'),
(5, 5, 3, '2025-05-30 08:00:00', '2025-05-30 09:00:00', '1', 46, '1'),
(5, 5, 3, '2025-06-06 08:00:00', '2025-06-06 09:00:00', '1', 47, '1'),
(5, 5, 3, '2025-06-13 08:00:00', '2025-06-13 09:00:00', '1', 48, '1'),
(5, 5, 3, '2025-06-20 08:00:00', '2025-06-20 09:00:00', '1', 49, '1'),
(5, 5, 3, '2025-06-27 08:00:00', '2025-06-27 09:00:00', '1', 50, '1'),
(5, 5, 3, '2025-07-04 08:00:00', '2025-07-04 09:00:00', '1', 51, '1'),
(5, 5, 3, '2025-07-11 08:00:00', '2025-07-11 09:00:00', '1', 52, '1'),
(5, 5, 3, '2025-07-18 08:00:00', '2025-07-18 09:00:00', '1', 53, '1'),
(5, 5, 3, '2025-07-25 08:00:00', '2025-07-25 09:00:00', '1', 54, '1'),
(5, 5, 3, '2025-08-01 08:00:00', '2025-08-01 09:00:00', '1', 55, '1'),
(5, 5, 3, '2025-08-08 08:00:00', '2025-08-08 09:00:00', '1', 56, '1'),
(5, 5, 3, '2025-08-15 08:00:00', '2025-08-15 09:00:00', '1', 57, '1'),
(5, 5, 3, '2025-08-22 08:00:00', '2025-08-22 09:00:00', '1', 58, '1'),
(5, 5, 3, '2025-08-29 08:00:00', '2025-08-29 09:00:00', '1', 59, '1'),
(5, 5, 3, '2025-09-05 08:00:00', '2025-09-05 09:00:00', '1', 60, '1'),
(5, 5, 3, '2025-09-12 08:00:00', '2025-09-12 09:00:00', '1', 61, '1'),
(5, 5, 3, '2025-09-19 08:00:00', '2025-09-19 09:00:00', '1', 62, '1'),
(5, 5, 3, '2025-09-26 08:00:00', '2025-09-26 09:00:00', '1', 63, '1'),
(5, 5, 3, '2025-10-03 08:00:00', '2025-10-03 09:00:00', '1', 64, '1'),
(5, 5, 3, '2025-10-10 08:00:00', '2025-10-10 09:00:00', '1', 65, '1'),
(5, 5, 3, '2025-10-17 08:00:00', '2025-10-17 09:00:00', '1', 66, '1'),
(5, 5, 3, '2025-10-24 08:00:00', '2025-10-24 09:00:00', '1', 67, '1'),
(5, 5, 3, '2025-10-31 08:00:00', '2025-10-31 09:00:00', '1', 68, '1'),
(5, 5, 3, '2025-11-07 08:00:00', '2025-11-07 09:00:00', '1', 69, '1'),
(5, 5, 3, '2025-11-14 08:00:00', '2025-11-14 09:00:00', '1', 70, '1'),
(5, 5, 3, '2025-11-21 08:00:00', '2025-11-21 09:00:00', '1', 71, '1'),
(5, 5, 3, '2025-11-28 08:00:00', '2025-11-28 09:00:00', '1', 72, '1'),
(5, 5, 3, '2025-12-05 08:00:00', '2025-12-05 09:00:00', '1', 73, '1'),
(5, 5, 3, '2025-12-12 08:00:00', '2025-12-12 09:00:00', '1', 74, '1'),
(5, 5, 3, '2025-12-19 08:00:00', '2025-12-19 09:00:00', '1', 75, '1'),
(5, 5, 3, '2025-12-26 08:00:00', '2025-12-26 09:00:00', '1', 76, '1');

--
-- Dumping data for table `class_enrollment`
--
INSERT INTO `class_enrollment` (`student_id`, `set_id`, `class_detail_id`, `enroll_datetime`, `status`) VALUES
(1, 1, 1, '2024-12-13 09:30:00', '1'),
(2, 2, 2, '2024-12-14 10:15:00', '1'),
(3, 3, 3, '2024-12-15 14:05:00', '1'),
(4, 4, 4, '2024-12-16 15:45:00', '1'),
(5, 5, 5, '2024-12-17 08:10:00', '1');


--
-- Dumping data for table `class_session`
--
INSERT INTO `class_session` (`schedule_id`, `schedule_datetime`, `attendance_code`, `code_expiry_datetime`) VALUES
(1, '2025-01-06 09:05:00', '582314', '2025-01-06 11:10:00'),
(2, '2025-01-13 09:10:00', '174925', '2025-01-13 11:15:00'),
(3, '2025-01-20 09:00:00', '672483', '2025-01-20 11:10:00'),
(4, '2025-01-27 09:15:00', '290741', '2025-01-27 11:05:00'),
(5, '2025-02-03 09:00:00', '118539', '2025-02-03 11:10:00'),
(6, '2025-02-10 09:10:00', '495206', '2025-02-10 11:15:00'),
(7, '2025-02-17 09:05:00', '843120', '2025-02-17 11:05:00'),
(8, '2025-02-24 09:12:00', '156492', '2025-02-24 11:05:00'),
(9, '2025-03-03 09:03:00', '720518', '2025-03-03 11:05:00'),
(10, '2025-03-10 09:09:00', '395104', '2025-03-10 11:05:00'),
(11, '2025-03-17 09:00:00', '582940', '2025-03-17 11:05:00'),
(12, '2025-03-24 09:14:00', '974210', '2025-03-24 11:05:00'),
(13, '2025-03-31 09:11:00', '402187', '2025-03-31 11:05:00'),
(14, '2025-04-07 09:04:00', '690251', '2025-04-07 11:05:00'),
(15, '2025-04-14 09:10:00', '812346', '2025-04-14 11:05:00'),
(16, '2025-04-21 09:06:00', '158923', '2025-04-21 11:05:00'),
(17, '2025-04-28 09:02:00', '903412', '2025-04-28 11:05:00'),
(18, '2025-05-05 09:07:00', '684159', '2025-05-05 11:05:00'),
(19, '2025-05-12 09:11:00', '271893', '2025-05-12 11:05:00'),
(20, '2025-05-19 09:01:00', '740325', '2025-05-19 11:05:00'),
(21, '2025-05-26 09:14:00', '514987', '2025-05-26 11:05:00'),
(22, '2025-06-02 09:05:00', '129764', '2025-06-02 11:05:00'),
(23, '2025-06-09 09:09:00', '867201', '2025-06-09 11:05:00'),
(24, '2025-06-16 09:04:00', '302519', '2025-06-16 11:05:00'),
(25, '2025-06-23 09:10:00', '795240', '2025-06-23 11:05:00'),
(26, '2025-06-30 09:12:00', '658774', '2025-06-30 11:05:00'),
(27, '2025-07-07 09:06:00', '421908', '2025-07-07 11:05:00'),
(28, '2025-07-14 09:02:00', '906341', '2025-07-14 11:05:00'),
(29, '2025-07-21 09:13:00', '153842', '2025-07-21 11:05:00'),
(30, '2025-07-28 09:08:00', '739205', '2025-07-28 11:05:00'),
(31, '2025-08-04 09:00:00', '218594', '2025-08-04 11:05:00'),
(32, '2025-08-11 09:14:00', '985720', '2025-08-11 11:05:00'),
(33, '2025-08-18 09:03:00', '470163', '2025-08-18 11:05:00'),
(34, '2025-08-25 09:07:00', '642815', '2025-08-25 11:05:00'),
(35, '2025-09-01 09:10:00', '893214', '2025-09-01 11:05:00'),
(36, '2025-09-08 09:04:00', '128507', '2025-09-08 11:05:00'),
(37, '2025-09-15 09:12:00', '590463', '2025-09-15 11:05:00'),
(38, '2025-09-22 09:05:00', '704819', '2025-09-22 11:05:00'),
(39, '2025-09-29 09:11:00', '317285', '2025-09-29 11:05:00'),
(40, '2025-10-06 09:08:00', '682140', '2025-10-06 11:05:00'),
(41, '2025-10-13 09:02:00', '275903', '2025-10-13 11:05:00'),
(42, '2025-10-20 09:14:00', '594183', '2025-10-20 11:05:00'),
(43, '2025-10-27 09:06:00', '801526', '2025-10-27 11:05:00'),
(44, '2025-11-03 09:03:00', '930674', '2025-11-03 11:05:00'),
(45, '2025-11-10 09:08:00', '416528', '2025-11-10 11:05:00'),
(46, '2025-11-17 09:00:00', '267819', '2025-11-17 11:05:00'),
(47, '2025-11-24 09:12:00', '584091', '2025-11-24 11:05:00'),
(48, '2025-12-01 09:07:00', '905437', '2025-12-01 11:05:00'),

-- Class 2 Class Session
(53, '2025-01-07 10:12:00', '583091', '2025-01-07 13:05:00'),
(54, '2025-01-14 10:03:00', '920574', '2025-01-14 13:05:00'),
(55, '2025-01-21 10:08:00', '314820', '2025-01-21 13:05:00'),
(56, '2025-01-28 10:15:00', '768251', '2025-01-28 13:05:00'),
(57, '2025-02-04 10:04:00', '142903', '2025-02-04 13:05:00'),
(58, '2025-02-11 10:11:00', '609472', '2025-02-11 13:05:00'),
(59, '2025-02-18 10:12:00', '835120', '2025-02-18 13:05:00'),
(60, '2025-02-25 10:03:00', '572609', '2025-02-25 13:05:00'),
(61, '2025-03-04 10:14:00', '493820', '2025-03-04 13:05:00'),
(62, '2025-03-11 10:09:00', '248136', '2025-03-11 13:05:00'),
(63, '2025-03-18 10:06:00', '914753', '2025-03-18 13:05:00'),
(64, '2025-03-25 10:12:00', '361420', '2025-03-25 13:05:00'),
(65, '2025-04-01 10:05:00', '782590', '2025-04-01 13:05:00'),
(66, '2025-04-08 10:11:00', '504837', '2025-04-08 13:05:00'),
(67, '2025-04-15 10:02:00', '639284', '2025-04-15 13:05:00'),
(68, '2025-04-22 10:06:00', '850142', '2025-04-22 13:05:00'),
(69, '2025-04-29 10:10:00', '721395', '2025-04-29 13:05:00'),
(70, '2025-05-06 10:15:00', '183205', '2025-05-06 13:05:00'),
(71, '2025-05-13 10:09:00', '954712', '2025-05-13 13:05:00'),
(72, '2025-05-20 10:01:00', '620184', '2025-05-20 13:05:00'),
(73, '2025-05-27 10:12:00', '407915', '2025-05-27 13:05:00'),
(74, '2025-06-03 10:04:00', '296041', '2025-06-03 13:05:00'),
(75, '2025-06-10 10:08:00', '583710', '2025-06-10 13:05:00'),
(76, '2025-06-17 10:15:00', '864230', '2025-06-17 13:05:00'),
(77, '2025-06-24 10:06:00', '139752', '2025-06-24 13:05:00'),
(78, '2025-07-01 10:11:00', '983241', '2025-07-01 13:05:00'),
(79, '2025-07-08 10:13:00', '214670', '2025-07-08 13:05:00'),
(80, '2025-07-15 10:05:00', '740916', '2025-07-15 13:05:00'),
(81, '2025-07-22 10:12:00', '609843', '2025-07-22 13:05:00'),
(82, '2025-07-29 10:03:00', '395712', '2025-07-29 13:05:00'),
(83, '2025-08-05 10:14:00', '874150', '2025-08-05 13:05:00'),
(84, '2025-08-12 10:06:00', '521947', '2025-08-12 13:05:00'),
(85, '2025-08-19 10:11:00', '780624', '2025-08-19 13:05:00'),
(86, '2025-08-26 10:15:00', '146852', '2025-08-26 13:05:00'),
(87, '2025-09-02 10:07:00', '930421', '2025-09-02 13:05:00'),
(88, '2025-09-09 10:04:00', '602358', '2025-09-09 13:05:00'),
(89, '2025-09-16 10:10:00', '587920', '2025-09-16 13:05:00'),
(90, '2025-09-23 10:05:00', '419583', '2025-09-23 13:05:00'),
(91, '2025-09-30 10:14:00', '258301', '2025-09-30 13:05:00'),
(92, '2025-10-07 10:12:00', '738540', '2025-10-07 13:05:00'),
(93, '2025-10-14 10:03:00', '865291', '2025-10-14 13:05:00'),
(94, '2025-10-21 10:09:00', '102934', '2025-10-21 13:05:00'),
(95, '2025-10-28 10:05:00', '592104', '2025-10-28 13:05:00'),
(96, '2025-11-04 10:13:00', '713205', '2025-11-04 13:05:00'),
(97, '2025-11-11 10:08:00', '392017', '2025-11-11 13:05:00'),
(98, '2025-11-18 10:02:00', '840952', '2025-11-18 13:05:00'),
(99, '2025-11-25 10:12:00', '159374', '2025-11-25 13:05:00'),
(100, '2025-12-02 10:11:00', '934621', '2025-12-02 13:05:00'),

-- Class 3 Class Session
(105, '2025-01-01 14:05:00', '482910', '2025-01-01 16:05:00'),
(106, '2025-01-08 14:10:00', '925134', '2025-01-08 16:05:00'),
(107, '2025-01-15 14:03:00', '640582', '2025-01-15 16:05:00'),
(108, '2025-01-22 14:14:00', '719054', '2025-01-22 16:05:00'),
(109, '2025-01-29 14:01:00', '850312', '2025-01-29 16:05:00'),
(110, '2025-02-05 14:11:00', '238041', '2025-02-05 16:05:00'),
(111, '2025-02-12 14:07:00', '583902', '2025-02-12 16:05:00'),
(112, '2025-02-19 14:00:00', '920415', '2025-02-19 16:05:00'),
(113, '2025-02-26 14:15:00', '154802', '2025-02-26 16:05:00'),
(114, '2025-03-05 14:04:00', '703258', '2025-03-05 16:05:00'),
(115, '2025-03-12 14:12:00', '417503', '2025-03-12 16:05:00'),
(116, '2025-03-19 14:01:00', '953740', '2025-03-19 16:05:00'),
(117, '2025-03-26 14:06:00', '248197', '2025-03-26 16:05:00'),
(118, '2025-04-02 14:10:00', '780249', '2025-04-02 16:05:00'),
(119, '2025-04-09 14:02:00', '694815', '2025-04-09 16:05:00'),
(120, '2025-04-16 14:15:00', '123578', '2025-04-16 16:05:00'),
(121, '2025-04-23 14:11:00', '856392', '2025-04-23 16:05:00'),
(122, '2025-04-30 14:05:00', '402891', '2025-04-30 16:05:00'),
(123, '2025-05-07 14:03:00', '915674', '2025-05-07 16:05:00'),
(124, '2025-05-14 14:14:00', '671230', '2025-05-14 16:05:00'),
(125, '2025-05-21 14:07:00', '502913', '2025-05-21 16:05:00'),
(126, '2025-05-28 14:01:00', '749315', '2025-05-28 16:05:00'),
(127, '2025-06-04 14:13:00', '890154', '2025-06-04 16:05:00'),
(128, '2025-06-11 14:05:00', '315840', '2025-06-11 16:05:00'),
(129, '2025-06-18 14:10:00', '204579', '2025-06-18 16:05:00'),
(130, '2025-06-25 14:12:00', '953870', '2025-06-25 16:05:00'),
(131, '2025-07-02 14:04:00', '621579', '2025-07-02 16:05:00'),
(132, '2025-07-09 14:15:00', '843205', '2025-07-09 16:05:00'),
(133, '2025-07-16 14:00:00', '930124', '2025-07-16 16:05:00'),
(134, '2025-07-23 14:06:00', '758349', '2025-07-23 16:05:00'),
(135, '2025-07-30 14:11:00', '284610', '2025-07-30 16:05:00'),
(136, '2025-08-06 14:03:00', '691054', '2025-08-06 16:05:00'),
(137, '2025-08-13 14:12:00', '345817', '2025-08-13 16:05:00'),
(138, '2025-08-20 14:09:00', '825194', '2025-08-20 16:05:00'),
(139, '2025-08-27 14:13:00', '268930', '2025-08-27 16:05:00'),
(140, '2025-09-03 14:10:00', '594781', '2025-09-03 16:05:00'),
(141, '2025-09-10 14:05:00', '160284', '2025-09-10 16:05:00'),
(142, '2025-09-17 14:00:00', '473918', '2025-09-17 16:05:00'),
(143, '2025-09-24 14:14:00', '812945', '2025-09-24 16:05:00'),
(144, '2025-10-01 14:02:00', '590314', '2025-10-01 16:05:00'),
(145, '2025-10-08 14:08:00', '347621', '2025-10-08 16:05:00'),
(146, '2025-10-15 14:12:00', '905741', '2025-10-15 16:05:00'),
(147, '2025-10-22 14:01:00', '168402', '2025-10-22 16:05:00'),
(148, '2025-10-29 14:10:00', '942610', '2025-10-29 16:05:00'),
(149, '2025-11-05 14:03:00', '581294', '2025-11-05 16:05:00'),
(150, '2025-11-12 14:11:00', '734950', '2025-11-12 16:05:00'),
(151, '2025-11-19 14:15:00', '480159', '2025-11-19 16:05:00'),
(152, '2025-11-26 14:06:00', '903782', '2025-11-26 16:05:00'),
-- (153, '2025-12-03 14:09:00', '652190', '2025-12-03 16:05:00'),

-- Class 4 Class Session
(158, '2025-01-02 15:05:00', '804129', '2025-01-02 19:05:00'),
(159, '2025-01-09 15:12:00', '519684', '2025-01-09 19:05:00'),
(160, '2025-01-16 15:08:00', '703142', '2025-01-16 19:05:00'),
(161, '2025-01-23 15:03:00', '286491', '2025-01-23 19:05:00'),
(162, '2025-01-30 15:14:00', '917350', '2025-01-30 19:05:00'),
(163, '2025-02-06 15:10:00', '653214', '2025-02-06 19:05:00'),
(164, '2025-02-13 15:07:00', '482963', '2025-02-13 19:05:00'),
(165, '2025-02-20 15:02:00', '190537', '2025-02-20 19:05:00'),
(166, '2025-02-27 15:09:00', '759613', '2025-02-27 19:05:00'),
(167, '2025-03-06 15:01:00', '824691', '2025-03-06 19:05:00'),
(168, '2025-03-13 15:11:00', '502973', '2025-03-13 19:05:00'),
(169, '2025-03-20 15:04:00', '364152', '2025-03-20 19:05:00'),
(170, '2025-03-27 15:13:00', '759240', '2025-03-27 19:05:00'),
(171, '2025-04-03 15:06:00', '918305', '2025-04-03 19:05:00'),
(172, '2025-04-10 15:05:00', '235107', '2025-04-10 19:05:00'),
(173, '2025-04-17 15:08:00', '413509', '2025-04-17 19:05:00'),
(174, '2025-04-24 15:15:00', '809254', '2025-04-24 19:05:00'),
(175, '2025-05-01 15:03:00', '620489', '2025-05-01 19:05:00'),
(176, '2025-05-08 15:14:00', '702856', '2025-05-08 19:05:00'),
(177, '2025-05-15 15:07:00', '941620', '2025-05-15 19:05:00'),
(178, '2025-05-22 15:01:00', '583102', '2025-05-22 19:05:00'),
(179, '2025-05-29 15:12:00', '791503', '2025-05-29 19:05:00'),
(180, '2025-06-05 15:09:00', '462093', '2025-06-05 19:05:00'),
(181, '2025-06-12 15:03:00', '915287', '2025-06-12 19:05:00'),
(182, '2025-06-19 15:13:00', '157804', '2025-06-19 19:05:00'),
(183, '2025-06-26 15:08:00', '836492', '2025-06-26 19:05:00'),
(184, '2025-07-03 15:11:00', '549730', '2025-07-03 19:05:00'),
(185, '2025-07-10 15:10:00', '296105', '2025-07-10 19:05:00'),
(186, '2025-07-17 15:04:00', '904512', '2025-07-17 19:05:00'),
(187, '2025-07-24 15:02:00', '781049', '2025-07-24 19:05:00'),
(188, '2025-07-31 15:15:00', '634207', '2025-07-31 19:05:00'),
(189, '2025-08-07 15:05:00', '812690', '2025-08-07 19:05:00'),
(190, '2025-08-14 15:14:00', '205783', '2025-08-14 19:05:00'),
(191, '2025-08-21 15:09:00', '590148', '2025-08-21 19:05:00'),
(192, '2025-08-28 15:04:00', '743210', '2025-08-28 19:05:00'),
(193, '2025-09-04 15:07:00', '920574', '2025-09-04 19:05:00'),
(194, '2025-09-11 15:03:00', '478126', '2025-09-11 19:05:00'),
(195, '2025-09-18 15:11:00', '867201', '2025-09-18 19:05:00'),
(196, '2025-09-25 15:15:00', '134796', '2025-09-25 19:05:00'),
(197, '2025-10-02 15:00:00', '953740', '2025-10-02 19:05:00'),
(198, '2025-10-09 15:10:00', '640923', '2025-10-09 19:05:00'),
(199, '2025-10-16 15:06:00', '874520', '2025-10-16 19:05:00'),
(200, '2025-10-23 15:12:00', '528917', '2025-10-23 19:05:00'),
(201, '2025-10-30 15:03:00', '290618', '2025-10-30 19:05:00'),
(202, '2025-11-06 15:14:00', '740195', '2025-11-06 19:05:00'),
(203, '2025-11-13 15:07:00', '815632', '2025-11-13 19:05:00'),
(204, '2025-11-20 15:05:00', '569210', '2025-11-20 19:05:00'),
(205, '2025-11-27 15:01:00', '183725', '2025-11-27 19:05:00'),

-- Class 5 Class Session
(210, '2025-01-03 08:05:00', '529147', '2025-01-03 09:05:00'),
(211, '2025-01-10 08:11:00', '819264', '2025-01-10 09:05:00'),
(212, '2025-01-17 08:02:00', '350918', '2025-01-17 09:05:00'),
(213, '2025-01-24 08:13:00', '704259', '2025-01-24 09:05:00'),
(214, '2025-01-31 08:04:00', '182640', '2025-01-31 09:05:00'),
(215, '2025-02-07 08:10:00', '915703', '2025-02-07 09:05:00'),
(216, '2025-02-14 08:03:00', '624501', '2025-02-14 09:05:00'),
(217, '2025-02-21 08:12:00', '340875', '2025-02-21 09:05:00'),
(218, '2025-02-28 08:01:00', '506921', '2025-02-28 09:05:00'),
(219, '2025-03-07 08:14:00', '274960', '2025-03-07 09:05:00'),
(220, '2025-03-14 08:08:00', '948521', '2025-03-14 09:05:00'),
(221, '2025-03-21 08:05:00', '601842', '2025-03-21 09:05:00'),
(222, '2025-03-28 08:09:00', '752014', '2025-03-28 09:05:00'),
(223, '2025-04-04 08:03:00', '419568', '2025-04-04 09:05:00'),
(224, '2025-04-11 08:15:00', '890625', '2025-04-11 09:05:00'),
(225, '2025-04-18 08:10:00', '736290', '2025-04-18 09:05:00'),
(226, '2025-04-25 08:04:00', '158437', '2025-04-25 09:05:00'),
(227, '2025-05-02 08:01:00', '845720', '2025-05-02 09:05:00'),
(228, '2025-05-09 08:14:00', '203519', '2025-05-09 09:05:00'),
(229, '2025-05-16 08:08:00', '975204', '2025-05-16 09:05:00'),
(230, '2025-05-23 08:11:00', '641093', '2025-05-23 09:05:00'),
(231, '2025-05-30 08:02:00', '328157', '2025-05-30 09:05:00'),
(232, '2025-06-06 08:07:00', '590218', '2025-06-06 09:05:00'),
(233, '2025-06-13 08:04:00', '739560', '2025-06-13 09:05:00'),
(234, '2025-06-20 08:12:00', '462871', '2025-06-20 09:05:00'),
(235, '2025-06-27 08:05:00', '814953', '2025-06-27 09:05:00'),
(236, '2025-07-04 08:10:00', '931576', '2025-07-04 09:05:00'),
(237, '2025-07-11 08:03:00', '502817', '2025-07-11 09:05:00'),
(238, '2025-07-18 08:15:00', '340692', '2025-07-18 09:05:00'),
(239, '2025-07-25 08:01:00', '975318', '2025-07-25 09:05:00'),
(240, '2025-08-01 08:04:00', '684219', '2025-08-01 09:05:00'),
(241, '2025-08-08 08:09:00', '253796', '2025-08-08 09:05:00'),
(242, '2025-08-15 08:14:00', '819650', '2025-08-15 09:05:00'),
(243, '2025-08-22 08:02:00', '572094', '2025-08-22 09:05:00'),
(244, '2025-08-29 08:11:00', '407586', '2025-08-29 09:05:00'),
(245, '2025-09-05 08:05:00', '614852', '2025-09-05 09:05:00'),
(246, '2025-09-12 08:10:00', '983201', '2025-09-12 09:05:00'),
(247, '2025-09-19 08:13:00', '760458', '2025-09-19 09:05:00'),
(248, '2025-09-26 08:02:00', '145690', '2025-09-26 09:05:00'),
(249, '2025-10-03 08:04:00', '578341', '2025-10-03 09:05:00'),
(250, '2025-10-10 08:12:00', '728964', '2025-10-10 09:05:00'),
(251, '2025-10-17 08:01:00', '389517', '2025-10-17 09:05:00'),
(252, '2025-10-24 08:06:00', '951240', '2025-10-24 09:05:00'),
(253, '2025-10-31 08:15:00', '204518', '2025-10-31 09:05:00'),
(254, '2025-11-07 08:09:00', '618470', '2025-11-07 09:05:00'),
(255, '2025-11-14 08:03:00', '732601', '2025-11-14 09:05:00'),
(256, '2025-11-21 08:11:00', '259738', '2025-11-21 09:05:00'),
(257, '2025-11-28 08:05:00', '987541', '2025-11-28 09:05:00');

--
-- Dumping data for table `attendance`
--
-- Class 1 (student 1)
INSERT INTO `attendance` (`student_id`, `session_id`, `attendance_time`, `status`) VALUES
(1,  1, '2025-01-06 09:25:00', '1'),
(1,  2, '2025-01-13 09:35:00', '1'),
(1,  3, '2025-01-20 09:30:00', '1'),
(1,  4, '2025-01-27 09:37:00', '1'),
(1,  5, '2025-02-03 09:28:00', '1'),
(1,  6, '2025-02-10 09:34:00', '1'),
(1,  7, '2025-02-17 09:25:00', '1'),
(1,  8, '2025-02-24 09:37:00', '1'),
(1,  9, '2025-03-03 09:23:00', '1'),
(1, 10, '2025-03-10 09:34:00', '1'),
(1, 11, '2025-03-17 09:30:00', '1'),
(1, 12, '2025-03-24 09:36:00', '1'),
(1, 13, '2025-03-31 09:31:00', '1'),
(1, 14, '2025-04-07 09:29:00', '1'),
(1, 15, '2025-04-14 09:40:00', '1'),
(1, 16, '2025-04-21 09:28:00', '1'),
(1, 17, '2025-04-28 09:22:00', '1'),
(1, 18, '2025-05-05 09:27:00', '1'),
(1, 19, '2025-05-12 09:31:00', '1'),
(1, 20, '2025-05-19 09:21:00', '1'),
(1, 21, '2025-05-26 09:34:00', '1'),
(1, 22, '2025-06-02 09:25:00', '1'),
(1, 23, '2025-06-09 09:34:00', '1'),
(1, 24, '2025-06-16 09:34:00', '1'),
(1, 25, '2025-06-23 09:30:00', '1'),
(1, 26, '2025-06-30 09:36:00', '1'),
(1, 27, '2025-07-07 09:26:00', '1'),
(1, 28, '2025-07-14 09:27:00', '1'),
(1, 29, '2025-07-21 09:33:00', '1'),
(1, 30, '2025-07-28 09:30:00', '1'),
(1, 31, '2025-08-04 09:20:00', '1'),
(1, 32, '2025-08-11 09:39:00', '1'),
(1, 33, '2025-08-18 09:23:00', '1'),
(1, 34, '2025-08-25 09:29:00', '1'),
(1, 35, '2025-09-01 09:30:00', '1'),
(1, 36, '2025-09-08 09:24:00', '1'),
(1, 37, '2025-09-15 09:32:00', '1'),
(1, 38, '2025-09-22 09:25:00', '1'),
(1, 39, '2025-09-29 09:36:00', '1'),
(1, 40, '2025-10-06 09:28:00', '1'),
(1, 41, '2025-10-13 09:22:00', '1'),
(1, 42, '2025-10-20 09:34:00', '1'),
(1, 43, '2025-10-27 09:26:00', '1'),
(1, 44, '2025-11-03 09:23:00', '1'),
(1, 45, '2025-11-10 09:28:00', '1'),
(1, 46, '2025-11-17 09:20:00', '1'),
(1, 47, '2025-11-24 09:32:00', '1'),
(1, 48, '2025-12-01 09:31:00', '1');

-- Class 2 (Student 2)
INSERT INTO `attendance` (`student_id`, `session_id`, `attendance_time`, `status`) VALUES
(2, 49, '2025-01-07 10:19:00', '1'),
(2, 50, '2025-01-14 10:14:00', '1'),
(2, 51, '2025-01-21 10:24:00', '1'),
(2, 52, '2025-01-28 10:33:00', '1'),

(2, 53, '2025-02-04 10:11:00', '1'),
(2, 54, '2025-02-11 10:25:00', '1'),
(2, 55, '2025-02-18 10:29:00', '1'),
(2, 56, '2025-02-25 10:14:00', '1'),

(2, 57, '2025-03-04 10:28:00', '1'),
(2, 58, '2025-03-11 10:22:00', '1'),
(2, 59, '2025-03-18 10:21:00', '1'),
(2, 60, '2025-03-25 10:26:00', '1'),

(2, 61, '2025-04-01 10:17:00', '1'),
(2, 62, '2025-04-08 10:24:00', '1'),
(2, 63, '2025-04-15 10:10:00', '1'),
(2, 64, '2025-04-22 10:18:00', '1'),

(2, 65, '2025-04-29 10:25:00', '1'),
(2, 66, '2025-05-06 10:23:00', '1'),
(2, 67, '2025-05-13 10:18:00', '1'),
(2, 68, '2025-05-20 10:11:00', '1'),

(2, 69, '2025-05-27 10:26:00', '1'),
(2, 70, '2025-06-03 10:18:00', '1'),
(2, 71, '2025-06-10 10:22:00', '1'),
(2, 72, '2025-06-17 10:28:00', '1'),

(2, 73, '2025-06-24 10:15:00', '1'),
(2, 74, '2025-07-01 10:22:00', '1'),
(2, 75, '2025-07-08 10:26:00', '1'),
(2, 76, '2025-07-15 10:18:00', '1'),

(2, 77, '2025-07-22 10:23:00', '1'),
(2, 78, '2025-07-29 10:11:00', '1'),
(2, 79, '2025-08-05 10:29:00', '1'),
(2, 80, '2025-08-12 10:19:00', '1'),

(2, 81, '2025-08-19 10:26:00', '1'),
(2, 82, '2025-08-26 10:20:00', '1'),
(2, 83, '2025-09-02 10:18:00', '1'),
(2, 84, '2025-09-09 10:15:00', '1'),

(2, 85, '2025-09-16 10:22:00', '1'),
(2, 86, '2025-09-23 10:17:00', '1'),
(2, 87, '2025-09-30 10:27:00', '1'),
(2, 88, '2025-10-07 10:24:00', '1'),

(2, 89, '2025-10-14 10:17:00', '1'),
(2, 90, '2025-10-21 10:23:00', '1'),
(2, 91, '2025-10-28 10:13:00', '1'),
(2, 92, '2025-11-04 10:27:00', '1'),

(2, 93, '2025-11-11 10:20:00', '1'),
(2, 94, '2025-11-18 10:15:00', '1'),
(2, 95, '2025-11-25 10:24:00', '1'),
(2, 96, '2025-12-02 10:26:00', '1');


-- Class 3 (student 3)
INSERT INTO `attendance` (`student_id`, `session_id`, `attendance_time`, `status`) VALUES
(3,  97, '2025-01-01 14:22:00', '1'),
(3,  98, '2025-01-08 14:24:00', '1'),
(3,  99, '2025-01-15 14:19:00', '1'),
(3, 100, '2025-01-22 14:33:00', '1'),
(3, 101, '2025-01-29 14:18:00', '1'),
(3, 102, '2025-02-05 14:26:00', '1'),
(3, 103, '2025-02-12 14:25:00', '1'),
(3, 104, '2025-02-19 14:18:00', '1'),
(3, 105, '2025-02-26 14:33:00', '1'),
(3, 106, '2025-03-05 14:21:00', '1'),
(3, 107, '2025-03-12 14:26:00', '1'),
(3, 108, '2025-03-19 14:19:00', '1'),
(3, 109, '2025-03-26 14:22:00', '1'),
(3, 110, '2025-04-02 14:27:00', '1'),
(3, 111, '2025-04-09 14:19:00', '1'),
(3, 112, '2025-04-16 14:32:00', '1'),
(3, 113, '2025-04-23 14:28:00', '1'),
(3, 114, '2025-04-30 14:21:00', '1'),
(3, 115, '2025-05-07 14:18:00', '1'),
(3, 116, '2025-05-14 14:32:00', '1'),
(3, 117, '2025-05-21 14:23:00', '1'),
(3, 118, '2025-05-28 14:19:00', '1'),
(3, 119, '2025-06-04 14:29:00', '1'),
(3, 120, '2025-06-11 14:22:00', '1'),
(3, 121, '2025-06-18 14:26:00', '1'),
(3, 122, '2025-06-25 14:30:00', '1'),
(3, 123, '2025-07-02 14:21:00', '1'),
(3, 124, '2025-07-09 14:33:00', '1'),
(3, 125, '2025-07-16 14:18:00', '1'),
(3, 126, '2025-07-23 14:25:00', '1'),
(3, 127, '2025-07-30 14:26:00', '1'),
(3, 128, '2025-08-06 14:23:00', '1'),
(3, 129, '2025-08-13 14:30:00', '1'),
(3, 130, '2025-08-20 14:25:00', '1'),
(3, 131, '2025-08-27 14:33:00', '1'),
(3, 132, '2025-09-03 14:28:00', '1'),
(3, 133, '2025-09-10 14:22:00', '1'),
(3, 134, '2025-09-17 14:18:00', '1'),
(3, 135, '2025-09-24 14:32:00', '1'),
(3, 136, '2025-10-01 14:21:00', '1'),
(3, 137, '2025-10-08 14:26:00', '1'),
(3, 138, '2025-10-15 14:32:00', '1'),
(3, 139, '2025-10-22 14:20:00', '1'),
(3, 140, '2025-10-29 14:25:00', '1'),
(3, 141, '2025-11-05 14:22:00', '1'),
(3, 142, '2025-11-12 14:31:00', '1'),
(3, 143, '2025-11-19 14:35:00', '1'),
(3, 144, '2025-11-26 14:25:00', '1');

INSERT INTO `attendance` (`student_id`, `session_id`, `attendance_time`, `status`) VALUES
(4, 145, '2025-01-02 15:21:00', '1'),
(4, 146, '2025-01-09 15:29:00', '1'),
(4, 147, '2025-01-16 15:24:00', '1'),
(4, 148, '2025-01-23 15:19:00', '1'),
(4, 149, '2025-01-30 15:30:00', '1'),
(4, 150, '2025-02-06 15:27:00', '1'),
(4, 151, '2025-02-13 15:24:00', '1'),
(4, 152, '2025-02-20 15:18:00', '1'),
(4, 153, '2025-02-27 15:27:00', '1'),
(4, 154, '2025-03-06 15:20:00', '1'),
(4, 155, '2025-03-13 15:28:00', '1'),
(4, 156, '2025-03-20 15:22:00', '1'),
(4, 157, '2025-03-27 15:33:00', '1'),
(4, 158, '2025-04-03 15:22:00', '1'),
(4, 159, '2025-04-10 15:23:00', '1'),
(4, 160, '2025-04-17 15:26:00', '1'),
(4, 161, '2025-04-24 15:32:00', '1'),
(4, 162, '2025-05-01 15:19:00', '1'),
(4, 163, '2025-05-08 15:33:00', '1'),
(4, 164, '2025-05-15 15:24:00', '1'),
(4, 165, '2025-05-22 15:19:00', '1'),
(4, 166, '2025-05-29 15:28:00', '1'),
(4, 167, '2025-06-05 15:26:00', '1'),
(4, 168, '2025-06-12 15:19:00', '1'),
(4, 169, '2025-06-19 15:29:00', '1'),
(4, 170, '2025-06-26 15:26:00', '1'),
(4, 171, '2025-07-03 15:27:00', '1'),
(4, 172, '2025-07-10 15:26:00', '1'),
(4, 173, '2025-07-17 15:19:00', '1'),
(4, 174, '2025-07-24 15:18:00', '1'),
(4, 175, '2025-07-31 15:32:00', '1'),
(4, 176, '2025-08-07 15:22:00', '1'),
(4, 177, '2025-08-14 15:33:00', '1'),
(4, 178, '2025-08-21 15:26:00', '1'),
(4, 179, '2025-08-28 15:20:00', '1'),
(4, 180, '2025-09-04 15:24:00', '1'),
(4, 181, '2025-09-11 15:18:00', '1'),
(4, 182, '2025-09-18 15:29:00', '1'),
(4, 183, '2025-09-25 15:32:00', '1'),
(4, 184, '2025-10-02 15:16:00', '1'),
(4, 185, '2025-10-09 15:29:00', '1'),
(4, 186, '2025-10-16 15:22:00', '1'),
(4, 187, '2025-10-23 15:28:00', '1'),
(4, 188, '2025-10-30 15:19:00', '1'),
(4, 189, '2025-11-06 15:32:00', '1'),
(4, 190, '2025-11-13 15:23:00', '1'),
(4, 191, '2025-11-20 15:21:00', '1'),
(4, 192, '2025-11-27 15:18:00', '1');

INSERT INTO `attendance` (`student_id`, `session_id`, `attendance_time`, `status`) VALUES
(5, 193, '2025-01-03 08:21:00', '1'),
(5, 194, '2025-01-10 08:28:00', '1'),
(5, 195, '2025-01-17 08:19:00', '1'),
(5, 196, '2025-01-24 08:29:00', '1'),
(5, 197, '2025-01-31 08:21:00', '1'),
(5, 198, '2025-02-07 08:27:00', '1'),
(5, 199, '2025-02-14 08:20:00', '1'),
(5, 200, '2025-02-21 08:29:00', '1'),
(5, 201, '2025-02-28 08:18:00', '1'),
(5, 202, '2025-03-07 08:30:00', '1'),
(5, 203, '2025-03-14 08:26:00', '1'),
(5, 204, '2025-03-21 08:21:00', '1'),
(5, 205, '2025-03-28 08:27:00', '1'),
(5, 206, '2025-04-04 08:20:00', '1'),
(5, 207, '2025-04-11 08:33:00', '1'),
(5, 208, '2025-04-18 08:27:00', '1'),
(5, 209, '2025-04-25 08:20:00', '1'),
(5, 210, '2025-05-02 08:18:00', '1'),
(5, 211, '2025-05-09 08:30:00', '1'),
(5, 212, '2025-05-16 08:24:00', '1'),
(5, 213, '2025-05-23 08:29:00', '1'),
(5, 214, '2025-05-30 08:19:00', '1'),
(5, 215, '2025-06-06 08:25:00', '1'),
(5, 216, '2025-06-13 08:21:00', '1'),
(5, 217, '2025-06-20 08:28:00', '1'),
(5, 218, '2025-06-27 08:21:00', '1'),
(5, 219, '2025-07-04 08:27:00', '1'),
(5, 220, '2025-07-11 08:20:00', '1'),
(5, 221, '2025-07-18 08:33:00', '1'),
(5, 222, '2025-07-25 08:18:00', '1'),
(5, 223, '2025-08-01 08:20:00', '1'),
(5, 224, '2025-08-08 08:27:00', '1'),
(5, 225, '2025-08-15 08:31:00', '1'),
(5, 226, '2025-08-22 08:18:00', '1'),
(5, 227, '2025-08-29 08:28:00', '1'),
(5, 228, '2025-09-05 08:21:00', '1'),
(5, 229, '2025-09-12 08:27:00', '1'),
(5, 230, '2025-09-19 08:30:00', '1'),
(5, 231, '2025-09-26 08:18:00', '1'),
(5, 232, '2025-10-03 08:20:00', '1'),
(5, 233, '2025-10-10 08:29:00', '1'),
(5, 234, '2025-10-17 08:18:00', '1'),
(5, 235, '2025-10-24 08:23:00', '1'),
(5, 236, '2025-10-31 08:33:00', '1'),
(5, 237, '2025-11-07 08:26:00', '1'),
(5, 238, '2025-11-14 08:20:00', '1'),
(5, 239, '2025-11-21 08:28:00', '1'),
(5, 240, '2025-11-28 08:21:00', '1');


--
-- Dumping data for table `other_service`
--
INSERT INTO `other_service` (`name`, `description`, `service_type`, `fee_type`, `deposit_fee`, `service_fee_per_month`, `service_fee_per_attend`, `address`, `status`) VALUES
('Morning Childcare', 'Childcare service before school starts', '1', '1', 100.00, 300.00, 0.00, NULL, '1'),
('Evening Childcare', 'Childcare service after school hours', '1', '1', 100.00, 350.00, 0.00, NULL, '1'),
('School Transport (Zone A)', 'Pickup and drop service within Zone A', '2', '2', 50.00, 0.00, 15.00, '12 Jalan Damai, Kuala Lumpur', '1'),
('School Transport (Zone B)', 'Pickup and drop service within Zone B', '2', '2', 50.00, 0.00, 18.00, '25 Jalan Sentosa, Petaling Jaya', '1'),
('Weekend Childcare', 'Weekend half-day childcare service', '1', '2', 80.00, 0.00, 20.00, NULL, '1');

--
-- Dumping data for table `service_enrollment`
--
INSERT INTO `service_enrollment` (`student_id`, `service_id`, `enroll_datetime`, `address`, `status`) VALUES
(1, 1, '2025-09-15 10:00:00', 'null', '1'),
(2, 2, '2025-09-17 14:30:00', 'null', '1'),
(3, 3, '2025-09-20 09:15:00', 'null', '1'),
(4, 4, '2025-09-22 11:00:00', 'null', '1'),
(5, 5, '2025-09-25 08:45:00', 'null', '1');

--
-- Dumping data for table `other_service_session`
--
INSERT INTO `other_service_session` (`service_id`, `tutor_id`, `service_date`, `notes`) VALUES
-- Service 1: Morning Childcare
(1, 1, '2025-10-01', 'Morning session - group A'),
(1, 1, '2025-10-15', 'Morning session - group B'),

-- Service 2: Evening Childcare
(2, 2, '2025-09-28', 'Evening supervision'),
(2, 2, '2025-10-18', 'Evening session makeup'),

-- Service 3: Transport Zone A
(3, 3, '2025-10-02', 'Zone A pickup route'),
(3, 3, '2025-10-16', 'Zone A drop-off route'),

-- Service 4: Transport Zone B
(4, 4, '2025-09-30', 'Zone B pickup'),
(4, 4, '2025-10-19', 'Zone B drop-off'),

-- Service 5: Weekend Childcare
(5, 5, '2025-10-05', 'Saturday group'),
(5, 5, '2025-10-12', 'Sunday group');

-- ===== November Sessions (generated) =====

INSERT INTO `other_service_session` (`service_id`, `tutor_id`, `service_date`, `notes`) VALUES
-- Service 1 (Morning Childcare, student 1)
(1, 1, '2025-11-03', 'Morning batch'),
(1, 1, '2025-11-07', 'Morning batch'),
(1, 1, '2025-11-14', 'Morning batch'),
(1, 1, '2025-11-21', 'Morning batch'),
(1, 1, '2025-11-28', 'Morning batch'),

-- Service 2 (Evening Childcare, student 2)
(2, 2, '2025-11-02', 'Evening care'),
(2, 2, '2025-11-09', 'Evening care'),
(2, 2, '2025-11-16', 'Evening care'),
(2, 2, '2025-11-23', 'Evening care'),

-- Service 3 (Transport Zone A, student 3)
(3, 3, '2025-11-01', 'Zone A route'),
(3, 3, '2025-11-05', 'Zone A route'),
(3, 3, '2025-11-12', 'Zone A route'),
(3, 3, '2025-11-18', 'Zone A route'),
(3, 3, '2025-11-26', 'Zone A route'),
(3, 3, '2025-11-30', 'Zone A route'),

-- Service 4 (Transport Zone B, student 4)
(4, 4, '2025-11-04', 'Zone B pickup'),
(4, 4, '2025-11-10', 'Zone B pickup'),
(4, 4, '2025-11-17', 'Zone B pickup'),
(4, 4, '2025-11-24', 'Zone B pickup'),

-- Service 5 (Weekend Childcare, student 5)
(5, 5, '2025-11-01', 'Weekend group'),
(5, 5, '2025-11-08', 'Weekend group'),
(5, 5, '2025-11-15', 'Weekend group'),
(5, 5, '2025-11-22', 'Weekend group'),
(5, 5, '2025-11-29', 'Weekend group');


--
-- Dumping data for table `other_service_attendance`
--
INSERT INTO `other_service_attendance` (`student_id`, `session_id`, `attendance_time`, `comment`, `status`) VALUES
-- Student 1 (Service 1 sessions)
(1, 1, '2025-10-01 07:45:00', 'On time', '1'),
(1, 2, '2025-10-15 07:40:00', 'On time', '1'),

-- Student 2 (Service 2 sessions)
(2, 3, '2025-09-28 18:05:00', 'Picked up early', '1'),
(2, 4, '2025-10-18 18:00:00', 'All good', '1'),

-- Student 3 (Service 3 sessions)
(3, 5, '2025-10-02 07:00:00', 'Pickup completed', '1'),
(3, 6, '2025-10-16 07:05:00', 'On schedule', '1'),

-- Student 4 (Service 4 sessions)
(4, 7, '2025-09-30 07:10:00', 'No delay', '1'),
(4, 8, '2025-10-19 07:15:00', 'Smooth ride', '1'),

-- Student 5 (Service 5 sessions)
(5, 9, '2025-10-05 09:00:00', 'Good behavior', '1'),
(5, 10, '2025-10-12 09:10:00', 'Participated well', '1'),

-- ===== November Attendance Records =====

-- Service 1 (student 1)
(1, 11, '2025-11-03 07:45:00', 'On time', '1'),
(1, 12, '2025-11-07 07:50:00', 'On time', '1'),
(1, 13, '2025-11-14 07:43:00', 'On time', '1'),
(1, 14, '2025-11-21 07:41:00', 'On time', '1'),
(1, 15, '2025-11-28 07:55:00', 'On time', '1'),

-- Service 2 (student 2)
(2, 16, '2025-11-02 18:05:00', 'All good', '1'),
(2, 17, '2025-11-09 18:10:00', 'All good', '1'),
(2, 18, '2025-11-16 18:02:00', 'All good', '1'),
(2, 19, '2025-11-23 18:00:00', 'All good', '1'),

-- Service 3 (student 3)
(3, 20, '2025-11-01 07:02:00', 'Pickup ok', '1'),
(3, 21, '2025-11-05 07:04:00', 'Pickup ok', '1'),
(3, 22, '2025-11-12 07:01:00', 'Pickup ok', '1'),
(3, 23, '2025-11-18 07:08:00', 'Pickup ok', '1'),
(3, 24, '2025-11-26 07:03:00', 'Pickup ok', '1'),
(3, 25, '2025-11-30 07:10:00', 'Pickup ok', '1'),

-- Service 4 (student 4)
(4, 26, '2025-11-04 07:15:00', 'Smooth', '1'),
(4, 27, '2025-11-10 07:12:00', 'Smooth', '1'),
(4, 28, '2025-11-17 07:14:00', 'Smooth', '1'),
(4, 29, '2025-11-24 07:11:00', 'Smooth', '1'),

-- Service 5 (student 5)
(5, 30, '2025-11-01 09:05:00', 'Good', '1'),
(5, 31, '2025-11-08 09:08:00', 'Good', '1'),
(5, 32, '2025-11-15 09:02:00', 'Good', '1'),
(5, 33, '2025-11-22 09:10:00', 'Good', '1'),
(5, 34, '2025-11-29 09:12:00', 'Good', '1');



--
-- Dumping data for table `payment`
--
INSERT INTO `payment` (`student_id`, `discount_amt`, `final_amt`, `received_amt`, `change_amt`, `payment_method`, `payment_datetime`, `created_datetime`, `payment_type`, `payment_status`) VALUES
(1, 0.00, 480.00, 500.00, 20.00, '1', '2025-11-01 06:22:36', '2025-11-01 06:20:11', 'monthly', '1'),
(2, 0.00, 585.00, 585.00, 0.00, '1', '2025-11-01 06:22:28', '2025-11-01 06:20:11', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-11-01 06:22:14', '2025-11-01 06:20:11', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-11-01 06:22:10', '2025-11-01 06:20:11', 'monthly', '1'),
(5, 0.00, 130.00, 200.00, 70.00, '1', '2025-11-01 06:22:05', '2025-11-01 06:20:11', 'monthly', '1');


INSERT INTO `payment` (
  `student_id`,
  `discount_amt`,
  `final_amt`,
  `received_amt`,
  `change_amt`,
  `payment_method`,
  `payment_datetime`,
  `created_datetime`,
  `payment_type`,
  `payment_status`
) VALUES
-- 2025-02-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-02-03 09:05:00', '2025-02-03 09:00:00', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-02-03 09:05:00', '2025-02-03 09:00:00', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-02-03 09:05:00', '2025-02-03 09:00:00', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-02-03 09:05:00', '2025-02-03 09:00:00', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-02-03 09:05:00', '2025-02-03 09:00:00', 'monthly', '1'),

-- 2025-03-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-03-03 09:05:00', '2025-03-03 09:00:00', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-03-03 09:05:00', '2025-03-03 09:00:00', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-03-03 09:05:00', '2025-03-03 09:00:00', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-03-03 09:05:00', '2025-03-03 09:00:00', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-03-03 09:05:00', '2025-03-03 09:00:00', 'monthly', '1'),

-- 2025-04-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-04-03 09:05:00', '2025-04-03 09:00:00', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-04-03 09:05:00', '2025-04-03 09:00:00', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-04-03 09:05:00', '2025-04-03 09:00:00', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-04-03 09:05:00', '2025-04-03 09:00:00', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-04-03 09:05:00', '2025-04-03 09:00:00', 'monthly', '1'),

-- 2025-05-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-05-03 09:05:00', '2025-05-03 09:00:00', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-05-03 09:05:00', '2025-05-03 09:00:00', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-05-03 09:05:00', '2025-05-03 09:00:00', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-05-03 09:05:00', '2025-05-03 09:00:00', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-05-03 09:05:00', '2025-05-03 09:00:00', 'monthly', '1'),

-- 2025-06-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-06-03 09:05:00', '2025-06-03 09:00:00', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-06-03 09:05:00', '2025-06-03 09:00:00', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-06-03 09:05:00', '2025-06-03 09:00:00', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-06-03 09:05:00', '2025-06-03 09:00:00', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-06-03 09:05:00', '2025-06-03 09:00:00', 'monthly', '1'),

-- 2025-07-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-07-03 09:05:00', '2025-07-03 09:00:00', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-07-03 09:05:00', '2025-07-03 09:00:00', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-07-03 09:05:00', '2025-07-03 09:00:00', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-07-03 09:05:00', '2025-07-03 09:00:00', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-07-03 09:05:00', '2025-07-03 09:00:00', 'monthly', '1'),

-- 2025-08-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-08-03 09:05:00', '2025-08-03 09:00:00', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-08-03 09:05:00', '2025-08-03 09:00:00', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-08-03 09:05:00', '2025-08-03 09:00:00', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-08-03 09:05:00', '2025-08-03 09:00:00', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-08-03 09:05:00', '2025-08-03 09:00:00', 'monthly', '1'),

-- 2025-09-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-09-03 09:05:00', '2025-09-03 09:00:00', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-09-03 09:05:00', '2025-09-03 09:00:00', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '3', '2025-09-03 09:05:00', '2025-09-03 09:00:00', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '3', '2025-09-03 09:05:00', '2025-09-03 09:00:00', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-09-03 09:05:00', '2025-09-03 09:00:00', 'monthly', '1'),

(1, 0.00, 300.00, 300.00, 0.00, '1', '2025-09-15 10:05:00', '2025-09-15 10:00:00', 'monthly', '1'),
(2, 0.00, 350.00, 350.00, 0.00, '1', '2025-09-17 14:35:00', '2025-09-17 14:30:00', 'monthly', '1'),
(3, 0.00, 50.00, 50.00, 0.00, '3', '2025-09-20 09:20:00', '2025-09-20 09:15:00', 'monthly', '1'),
(4, 0.00, 50.00, 50.00, 0.00, '3', '2025-09-22 11:05:00', '2025-09-22 11:00:00', 'monthly', '1'),
(5, 0.00, 80.00, 80.00, 0.00, '1', '2025-09-25 08:50:00', '2025-09-25 08:45:00', 'monthly', '1'),

-- 2025-10-03
(1, 0.00, 180.00, 180.00, 0.00, '1', '2025-10-03 06:22:00', '2025-10-03 06:20:11', 'monthly', '1'),
(2, 0.00, 235.00, 235.00, 0.00, '1', '2025-10-03 06:22:00', '2025-10-03 06:20:11', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '1', '2025-10-03 06:22:00', '2025-10-03 06:20:11', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '1', '2025-10-03 06:22:00', '2025-10-03 06:20:11', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-10-03 06:22:00', '2025-10-03 06:20:11', 'monthly', '1'),

-- 2025-11-03
(1, 0.00, 480.00, 480.00, 0.00, '1', '2025-11-03 06:22:00', '2025-11-03 06:20:11', 'monthly', '1'),
(2, 0.00, 585.00, 585.00, 0.00, '1', '2025-11-03 06:22:00', '2025-11-03 06:20:11', 'monthly', '1'),
(3, 0.00, 160.00, 160.00, 0.00, '1', '2025-11-03 06:22:00', '2025-11-03 06:20:11', 'monthly', '1'),
(4, 0.00, 195.00, 195.00, 0.00, '1', '2025-11-03 06:22:00', '2025-11-03 06:20:11', 'monthly', '1'),
(5, 0.00, 130.00, 130.00, 0.00, '1', '2025-11-03 06:22:00', '2025-11-03 06:20:11', 'monthly', '1');


INSERT INTO `payment_detail` (`payment_id`, `class_detail_id`, `set_id`, `class_enrollment_id`, `service_id`, `service_name`, `service_fee`, `service_attend_time`, `class_name`, `class_fee`, `fee_type`) VALUES
(1, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(1, NULL, NULL, NULL, 1, 'Morning Childcare', 300.00, NULL, NULL, NULL, '1'),
(2, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science', 235.00, '1'),
(2, NULL, NULL, NULL, 2, 'Evening Childcare', 350.00, NULL, NULL, NULL, '1'),
(3, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English', 160.00, '1'),
(3, NULL, NULL, NULL, 3, 'School Transport (Zone A)', 0.00, 0, NULL, NULL, '3'),
(4, NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History', 195.00, '1'),
(4, NULL, NULL, NULL, 4, 'School Transport (Zone B)', 0.00, 0, NULL, NULL, '3'),
(5, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art', 130.00, '1'),
(5, NULL, NULL, NULL, 5, 'Weekend Childcare', 0.00, 0, NULL, NULL, '3');

INSERT INTO `payment_detail` (
  `payment_id`,
  `class_detail_id`,
  `set_id`,
  `class_enrollment_id`,
  `service_id`,
  `service_name`,
  `service_fee`,
  `service_attend_time`,
  `class_name`,
  `class_fee`,
  `fee_type`
) VALUES
-- 2025-02 (payment_id 6–10)
(6,  NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(7,  NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science',    235.00, '1'),
(8,  NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English',    160.00, '1'),
(9,  NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History',    195.00, '1'),
(10, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art',        130.00, '1'),

-- 2025-03 (11–15)
(11, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(12, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science',     235.00, '1'),
(13, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English',     160.00, '1'),
(14, NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History',     195.00, '1'),
(15, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art',         130.00, '1'),

-- 2025-04 (16–20)
(16, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(17, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science',     235.00, '1'),
(18, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English',     160.00, '1'),
(19, NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History',     195.00, '1'),
(20, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art',         130.00, '1'),

-- 2025-05 (21–25)
(21, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(22, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science',     235.00, '1'),
(23, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English',     160.00, '1'),
(24, NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History',     195.00, '1'),
(25, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art',         130.00, '1'),

-- 2025-06 (26–30)
(26, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(27, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science',     235.00, '1'),
(28, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English',     160.00, '1'),
(29, NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History',     195.00, '1'),
(30, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art',         130.00, '1'),

-- 2025-07 (31–35)
(31, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(32, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science',     235.00, '1'),
(33, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English',     160.00, '1'),
(34, NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History',     195.00, '1'),
(35, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art',         130.00, '1'),

-- 2025-08 (36–40)
(36, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(37, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science',     235.00, '1'),
(38, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English',     160.00, '1'),
(39, NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History',     195.00, '1'),
(40, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art',         130.00, '1'),

-- 2025-09 (41–45)
(41, NULL, NULL, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(42, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Science',     235.00, '1'),
(43, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'English',     160.00, '1'),
(44, NULL, NULL, 4, NULL, NULL, NULL, NULL, 'History',     195.00, '1'),
(45, NULL, NULL, 5, NULL, NULL, NULL, NULL, 'Art',         130.00, '1'),

(46, NULL, NULL, NULL, 1, 'Morning Childcare',          300.00, NULL, NULL, NULL, '3'),
(47, NULL, NULL, NULL, 2, 'Evening Childcare',          350.00, NULL, NULL, NULL, '3'),
(48, NULL, NULL, NULL, 3, 'School Transport (Zone A)',   50.00,    0, NULL, NULL, '3'),
(49, NULL, NULL, NULL, 4, 'School Transport (Zone B)',   50.00,    0, NULL, NULL, '3'),
(50, NULL, NULL, NULL, 5, 'Weekend Childcare',           80.00,    0, NULL, NULL, '3'),

-- 2025-10 ()
(51, 1, 1, 1, NULL, NULL, NULL, NULL, 'Mathematics', 180.00, '1'),
(52, 2, 2, 2, NULL, NULL, NULL, NULL, 'Science',     235.00, '1'),
(53, 3, 3, 3, NULL, NULL, NULL, NULL, 'English',     160.00, '1'),
(54, 4, 4, 4, NULL, NULL, NULL, NULL, 'History',     195.00, '1'),
(55, 5, 5, 5, NULL, NULL, NULL, NULL, 'Art',         130.00, '1'),

-- 2025-11 ()
(56, 1, 1, 1, NULL, NULL, NULL, NULL, 'Mathematics',       180.00, '1'),
(56, NULL, NULL, NULL, 1, 'Morning Childcare',             300.00, NULL, NULL, NULL, '3'),
(57, 2, 2, 2, NULL, NULL, NULL, NULL, 'Science',           235.00, '1'),
(57, NULL, NULL, NULL, 2, 'Evening Childcare',             350.00, NULL, NULL, NULL, '3'),
(58, 3, 3, 3, NULL, NULL, NULL, NULL, 'English',           160.00, '1'),
(59, 4, 4, 4, NULL, NULL, NULL, NULL, 'History',           195.00, '1'),
(60, 5, 5, 5, NULL, NULL, NULL, NULL, 'Art',               130.00, '1');

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


-- -- For truncate table
-- SET FOREIGN_KEY_CHECKS = 0;

-- TRUNCATE TABLE `announcement`;
-- TRUNCATE TABLE `attendance`;
-- TRUNCATE TABLE `chat_room`;
-- TRUNCATE TABLE `chat_room_member`;
-- TRUNCATE TABLE `class`;
-- TRUNCATE TABLE `class_detail`;
-- TRUNCATE TABLE `class_enrollment`;
-- TRUNCATE TABLE `class_session`;
-- TRUNCATE TABLE `discount_metric`;
-- TRUNCATE TABLE `education_level`;
-- TRUNCATE TABLE `evaluation_metrics`;
-- TRUNCATE TABLE `evaluation_test`;
-- TRUNCATE TABLE `evaluation_upload`;
-- TRUNCATE TABLE `evaluationanswerlog`;
-- TRUNCATE TABLE `evaluationlevel`;
-- TRUNCATE TABLE `evaluationquestion`;
-- TRUNCATE TABLE `evaluationupload`;
-- TRUNCATE TABLE `homework`;
-- TRUNCATE TABLE `message`;
-- TRUNCATE TABLE `other_service`;
-- TRUNCATE TABLE `other_service_attendance`;
-- TRUNCATE TABLE `other_service_session`;
-- TRUNCATE TABLE `package_set_detail`;
-- TRUNCATE TABLE `parent`;
-- TRUNCATE TABLE `payment`;
-- TRUNCATE TABLE `payment_detail`;
-- TRUNCATE TABLE `room`;
-- TRUNCATE TABLE `schedule_package`;
-- TRUNCATE TABLE `schedule_package_set`;
-- TRUNCATE TABLE `service_enrollment`;
-- TRUNCATE TABLE `student`;
-- TRUNCATE TABLE `studentevaluationresult`;
-- TRUNCATE TABLE `subject`;
-- TRUNCATE TABLE `submission`;
-- TRUNCATE TABLE `system_user`;
-- TRUNCATE TABLE `time_schedule`;
-- TRUNCATE TABLE `tutor`;

-- SET FOREIGN_KEY_CHECKS = 1;
