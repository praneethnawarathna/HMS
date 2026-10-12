import { MdBedroomParent, MdDashboard, MdAdminPanelSettings } from "react-icons/md";
import { FaSchool, FaUserGraduate, FaGear } from "react-icons/fa6";
import { FaUserCog, FaUsers, FaUserLock, FaMoneyBillWave, FaFileExcel } from "react-icons/fa";
import { MdContactEmergency } from "react-icons/md";
import { FaHouseUser } from "react-icons/fa";
import { TbReportAnalytics } from "react-icons/tb";


const dashsidedata = [
    {
        id: 1,
        name: 'Dashboard',
        link: '/Dashboard/Home',
        icon: MdDashboard
    },
    {
        id: 2,
        name: 'Hostel',
        link: '/Dashboard/Hostels',
        icon: FaSchool
    },
    {
        id: 4,
        name: 'Rooms',
        link: '/Dashboard/Rooms',
        icon: MdBedroomParent
    },
    {
        id: 5,
        name: 'Rooms',
        link: '/Dashboard/WardenRooms',
        icon: MdBedroomParent
    },
    {
        id: 6,
        name: 'Students',
        link: '/Dashboard/Students',
        icon: FaUserGraduate
    },
    {
        id: 7,
        name: 'Students',
        link: '/Dashboard/WardenStudents',
        icon: FaUserGraduate
    },
    {
        id: 8,
        name: 'Profile',
        link: '/Dashboard/Profile',
        icon: FaUserCog,
    },
    {
        id: 9,
        name: 'Permission',
        link: '/Dashboard/Permissions',
        icon: FaUserLock
    },
    {
        id: 10,
        name: 'Users',
        link: '/Dashboard/Users',
        icon: FaUsers
    },
    {
        id: 11,
        name: 'Wardens',
        link: '/Dashboard/Wardens',
        icon: FaUserCog
    },
    {
        id: 12,
        name: 'EmergencyContact',
        link: '/Dashboard/EmergencyContact',
        icon: MdContactEmergency
    },
    {
        id: 13,
        name: 'Extra Needs',
        link: '/Dashboard/ExtraNeeds',
        icon: FaHouseUser
    },
    {
        id: 14,
        name: 'Student Extra Needs',
        link: '/Dashboard/StdExtraNeeds',
        icon: FaHouseUser
    },
    {
        id: 16,
        name: 'Student Extra Needs',
        link: '/Dashboard/AdminExtraNeeds',
        icon: FaHouseUser
    },
    {
        id: 22,
        name: 'Special Need',
        link: '/Dashboard/AdminCreateSpecialNeed',
        icon: FaHouseUser
    },
    {
        id: 15,
        name: 'Payments',
        link: '/Dashboard/WardenPayments',
        icon: FaMoneyBillWave
    },
    {
        id: 17,
        name: 'Backup Options',
        link: '/Dashboard/BackupOptions',
        icon: FaGear
    },
    {
        id: 18,
        name: 'Eligible Students',
        link: '/Dashboard/EligibleStudents',
        icon: FaUserGraduate
    },
    {
        id: 19,
        name: 'Assigned Students',
        link: '/Dashboard/AssignedStudents',
        icon: FaUserGraduate
    },
    {
        id: 20,
        name: 'Reports',
        link: '/Dashboard/Reports',
        icon: TbReportAnalytics
    },
    {
        id: 21,
        name: 'Assign via Excel',
        link: '/Dashboard/Assign-via-excel',
        icon: FaFileExcel
    },
]

export { dashsidedata }