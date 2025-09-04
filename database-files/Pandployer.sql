-- MySQL dump 10.13  Distrib 8.0.42, for macos15 (x86_64)
--
-- Host: localhost    Database: pandployer
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Candidates`
--

DROP TABLE IF EXISTS `Candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Candidates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resume_id` int NOT NULL,
  `interview` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `resume_id` (`resume_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Candidates`
--

LOCK TABLES `Candidates` WRITE;
/*!40000 ALTER TABLE `Candidates` DISABLE KEYS */;
INSERT INTO `Candidates` VALUES (1,1,'https://www.youtube.com/embed/OVAMb6Kui6A'),(2,2,'https://www.youtube.com/embed/KCm6JVtoRdo'),(3,3,'https://www.youtube.com/embed/srw4r3htm4U'),(4,4,'https://www.youtube.com/embed/sjTxmq68RXU'),(5,5,'https://www.youtube.com/embed/sjTxmq68RXU'),(6,6,'https://www.youtube.com/embed/6bJTEZnTT5A'),(7,7,'https://www.youtube.com/embed/es7XtrloDIQ'),(8,8,'https://www.youtube.com/embed/0siE31sqz0Q'),(9,9,'https://www.youtube.com/embed/5v-wyR5emRw'),(10,10,'https://www.youtube.com/embed/TQHW7gGjrCQ');
/*!40000 ALTER TABLE `Candidates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Interview_vids`
--

DROP TABLE IF EXISTS `Interview_vids`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Interview_vids` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `resume_id` int NOT NULL,
  `video_path` varchar(255) NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Interview_vids`
--

LOCK TABLES `Interview_vids` WRITE;
/*!40000 ALTER TABLE `Interview_vids` DISABLE KEYS */;
INSERT INTO `Interview_vids` VALUES (1,'Interview1',1,'https://www.youtube.com/embed/OVAMb6Kui6A','2025-07-07 18:33:01'),(2,'Interview2',2,'https://www.youtube.com/embed/KCm6JVtoRdo','2025-07-07 18:33:01'),(3,'Interview3',3,'https://www.youtube.com/embed/srw4r3htm4U','2025-07-07 18:33:01'),(4,'Interview5',4,'https://www.youtube.com/embed/sjTxmq68RXU','2025-07-07 18:33:01'),(5,'Interview5',5,'https://www.youtube.com/embed/sjTxmq68RXU','2025-07-07 18:33:01'),(6,'Interview6',6,'https://www.youtube.com/embed/6bJTEZnTT5A','2025-07-07 18:33:01'),(7,'Interview7',7,'https://www.youtube.com/embed/es7XtrloDIQ','2025-07-07 18:33:01'),(8,'Interview8',8,'https://www.youtube.com/embed/0siE31sqz0Q','2025-07-07 18:33:01'),(9,'Interview9',9,'https://www.youtube.com/embed/5v-wyR5emRw','2025-07-07 18:33:01'),(10,'Interview10',10,'https://www.youtube.com/embed/TQHW7gGjrCQ','2025-07-07 18:33:01');
/*!40000 ALTER TABLE `Interview_vids` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `InterviewPage`
--

DROP TABLE IF EXISTS `InterviewPage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InterviewPage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `group_id` int NOT NULL,
  `class` int NOT NULL,
  `question1` int NOT NULL,
  `question2` int NOT NULL,
  `question3` int NOT NULL,
  `question4` int NOT NULL,
  `candidate_id` int NOT NULL,
  `checked` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `candidate_id` (`candidate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `InterviewPage`
--

LOCK TABLES `InterviewPage` WRITE;
/*!40000 ALTER TABLE `InterviewPage` DISABLE KEYS */;
/*!40000 ALTER TABLE `InterviewPage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_descriptions`
--

DROP TABLE IF EXISTS `job_descriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_descriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_descriptions`
--

LOCK TABLES `job_descriptions` WRITE;
/*!40000 ALTER TABLE `job_descriptions` DISABLE KEYS */;
INSERT INTO `job_descriptions` VALUES (1,'Carbonite','uploads/jobdescription/carbonite-jobdes.pdf','2025-07-07 18:33:01'),(2,'Cygilant','uploads/jobdescription/Cygilant Security Research Job Description.pdf','2025-07-07 18:33:01'),(3,'Motionlogic','uploads/jobdescription/QA Coop Motionlogic (Berlin, Germany).pdf','2025-07-07 18:33:01'),(4,'Sample','uploads/jobdescription/sample-job-description.pdf','2025-07-07 18:33:01'),(5,'Source One','uploads/jobdescription/SourceOneJobDescription.pdf','2025-07-07 18:33:01'),(6,'Two Six Labs','uploads/jobdescription/Two Six Labs Data Visualization Co-op Job Description.pdf','2025-07-07 18:33:01');
/*!40000 ALTER TABLE `job_descriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MakeOfferPage`
--

DROP TABLE IF EXISTS `MakeOfferPage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MakeOfferPage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `selected_candidate` int NOT NULL,
  `timespent` int NOT NULL,
  `group_id` int NOT NULL,
  `class` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `selected_candidate` (`selected_candidate`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `MakeOfferPage_ibfk_1` FOREIGN KEY (`selected_candidate`) REFERENCES `Candidates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `MakeOfferPage_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `Groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MakeOfferPage`
--

LOCK TABLES `MakeOfferPage` WRITE;
/*!40000 ALTER TABLE `MakeOfferPage` DISABLE KEYS */;
/*!40000 ALTER TABLE `MakeOfferPage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Moderator`
--

DROP TABLE IF EXISTS `Moderator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Moderator` (
  `id` int NOT NULL AUTO_INCREMENT UNIQUE,
  `admin_email` varchar(45) NOT NULL,
  `crn` int NOT NULL UNIQUE,
  `nom_groups` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Moderator`
--

LOCK TABLES `Moderator` WRITE;
/*!40000 ALTER TABLE `Moderator` DISABLE KEYS */;
/*!40000 ALTER TABLE `Moderator` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Notes`
--

DROP TABLE IF EXISTS `Notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_email` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_email` (`user_email`),
  CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`user_email`) REFERENCES `Users` (`email`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Notes`
--

LOCK TABLES `Notes` WRITE;
/*!40000 ALTER TABLE `Notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `Notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Resume`
--

DROP TABLE IF EXISTS `Resume`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Resume` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `group_id` int NOT NULL,
  `class` int NOT NULL,
  `timespent` int NOT NULL,
  `resume_number` int NOT NULL,
  `vote` enum('yes','no','unanswered') NOT NULL,
  `checked` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `Resume_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Resume`
--

LOCK TABLES `Resume` WRITE;
/*!40000 ALTER TABLE `Resume` DISABLE KEYS */;
/*!40000 ALTER TABLE `Resume` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Resume_pdfs`
--

DROP TABLE IF EXISTS `Resume_pdfs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Resume_pdfs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Resume_pdfs`
--

LOCK TABLES `Resume_pdfs` WRITE;
/*!40000 ALTER TABLE `Resume_pdfs` DISABLE KEYS */;
INSERT INTO `Resume_pdfs` VALUES (1,'sample1','uploads/resumes/sample1.pdf','2025-07-07 18:33:01'),(2,'sample2','uploads/resumes/sample2.pdf','2025-07-07 18:33:01'),(3,'sample3','uploads/resumes/sample3.pdf','2025-07-07 18:33:01'),(4,'sample4','uploads/resumes/sample4.pdf','2025-07-07 18:33:01'),(5,'sample5','uploads/resumes/sample5.pdf','2025-07-07 18:33:01'),(6,'sample6','uploads/resumes/sample6.pdf','2025-07-07 18:33:01'),(7,'sample7','uploads/resumes/sample7.pdf','2025-07-07 18:33:01'),(8,'sample8','uploads/resumes/sample8.pdf','2025-07-07 18:33:01'),(9,'sample9','uploads/resumes/sample9.pdf','2025-07-07 18:33:01'),(10,'sample10','uploads/resumes/sample10.pdf','2025-07-07 18:33:01');
/*!40000 ALTER TABLE `Resume_pdfs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Resumepage`
--

DROP TABLE IF EXISTS `Resumepage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Resumepage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `visited` datetime DEFAULT CURRENT_TIMESTAMP,
  `student_id` int NOT NULL,
  `timespent` int NOT NULL,
  `vote` enum('yes','no','unanswered') DEFAULT 'unanswered',
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `Resumepage_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `Users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Resumepage`
--

LOCK TABLES `Resumepage` WRITE;
/*!40000 ALTER TABLE `Resumepage` DISABLE KEYS */;
/*!40000 ALTER TABLE `Resumepage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Resumepage2`
--

DROP TABLE IF EXISTS `Resumepage2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Resumepage2` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vote1` int NOT NULL,
  `vote2` int NOT NULL,
  `vote3` int NOT NULL,
  `vote4` int NOT NULL,
  `timespent` int NOT NULL,
  `group_id` int NOT NULL,
  `class` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `Resumepage2_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `Groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Resumepage2`
--

LOCK TABLES `Resumepage2` WRITE;
/*!40000 ALTER TABLE `Resumepage2` DISABLE KEYS */;
/*!40000 ALTER TABLE `Resumepage2` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `f_name` varchar(50) NOT NULL,
  `l_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `affiliation` enum('student','admin') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `group_id` int DEFAULT NULL,
  `job_des` varchar(100) DEFAULT NULL,
  `class` int DEFAULT NULL,
  `current_page` enum('dashboard','resumepage','resumepage2','jobdes','interviewpage','makeofferpage') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users`
--

LOCK TABLES `Users` WRITE;
/*!40000 ALTER TABLE `Users` DISABLE KEYS */;
INSERT INTO `Users` VALUES (1,'Sai A.','Dhanasiri','saianirudhsjps@gmail.com','student','2025-07-07 18:33:01',NULL,NULL,1,NULL),(2,'Sage','Batchelor','sagebatchelor@gmail.com','student','2025-07-07 18:33:01',NULL,NULL,1,NULL),(3,'Sag','Bat','batchelor.sa@husky.neu.edu','student','2025-07-07 18:33:01',NULL,NULL,2,NULL),(4,'Sage','Batchelor','sagashrimproll@gmail.com','admin','2025-07-07 18:33:01',NULL,NULL,NULL,NULL),(5,'Sai Anirudh','Dhanasiri','dhanasiri.s@husky.neu.edu','admin','2025-07-07 18:33:01',NULL,NULL,NULL,NULL),(6,'Penguin','The Last','ilovepenguinsandhowtheylook@gmail.com','student','2025-07-07 18:33:01',NULL,NULL,1,NULL);
/*!40000 ALTER TABLE `Users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-03 13:04:24
