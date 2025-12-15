"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { EmployeeForm } from "@/components/employee-form";
import { getEmployeeById } from "@/lib/actions/employee";
import {
  getDepartments,
  getSubDepartmentsByDepartment,
  type Department,
  type SubDepartment,
} from "@/lib/actions/department";
import {
  getEmployeeGrades,
  type EmployeeGrade,
} from "@/lib/actions/employee-grade";
import { getDesignations, type Designation } from "@/lib/actions/designation";
import {
  getMaritalStatuses,
  type MaritalStatus,
} from "@/lib/actions/marital-status";
import {
  getEmployeeStatuses,
  type EmployeeStatus,
} from "@/lib/actions/employee-status";
import { getBranches, type Branch } from "@/lib/actions/branch";
import {
  getStates,
  getCitiesByState,
  type State,
  type City,
} from "@/lib/actions/city";
import { getEquipments, type Equipment } from "@/lib/actions/equipment";
import {
  getWorkingHoursPolicies,
  type WorkingHoursPolicy,
} from "@/lib/actions/working-hours-policy";
import {
  getLeavesPolicies,
  type LeavesPolicy,
} from "@/lib/actions/leaves-policy";
import { getQualifications, type Qualification } from "@/lib/actions/qualification";
import { getInstitutes, type Institute } from "@/lib/actions/institute";
import type { Employee } from "@/lib/actions/employee";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const [loadingEmployee, setLoadingEmployee] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);

  // Dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [employeeGrades, setEmployeeGrades] = useState<EmployeeGrade[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatus[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [workingHoursPolicies, setWorkingHoursPolicies] = useState<WorkingHoursPolicy[]>([]);
  const [leavesPolicies, setLeavesPolicies] = useState<LeavesPolicy[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  // Load employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!employeeId) return;
      try {
        setLoadingEmployee(true);
        const result = await getEmployeeById(employeeId);
        
        if (result.status && result.data) {
          setEmployee(result.data);
        } else {
          toast.error(result.message || "Failed to load employee");
          router.push("/dashboard/employee/list");
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        toast.error("Failed to load employee");
        router.push("/dashboard/employee/list");
      } finally {
        setLoadingEmployee(false);
      }
    };

    fetchEmployee();
  }, [employeeId, router]);

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [
          deptsRes,
          gradesRes,
          designationsRes,
          maritalRes,
          statusesRes,
          branchesRes,
          statesRes,
          equipmentsRes,
          workingHoursRes,
          leavesRes,
          qualificationsRes,
          institutesRes,
        ] = await Promise.all([
          getDepartments(),
          getEmployeeGrades(),
          getDesignations(),
          getMaritalStatuses(),
          getEmployeeStatuses(),
          getBranches(),
          getStates(),
          getEquipments(),
          getWorkingHoursPolicies(),
          getLeavesPolicies(),
          getQualifications(),
          getInstitutes(),
        ]);

        if (deptsRes.status) setDepartments(deptsRes.data || []);
        if (gradesRes.status) setEmployeeGrades(gradesRes.data || []);
        if (designationsRes.status) setDesignations(designationsRes.data || []);
        if (maritalRes.status) setMaritalStatuses(maritalRes.data || []);
        if (statusesRes.status) setEmployeeStatuses(statusesRes.data || []);
        if (branchesRes.status) setBranches(branchesRes.data || []);
        if (statesRes.status) setStates(statesRes.data || []);
        if (equipmentsRes.status) setEquipments(equipmentsRes.data || []);
        if (workingHoursRes.status) setWorkingHoursPolicies(workingHoursRes.data || []);
        if (leavesRes.status) setLeavesPolicies(leavesRes.data || []);
        if (qualificationsRes.status) setQualifications(qualificationsRes.data || []);
        if (institutesRes.status) setInstitutes(institutesRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Fetch sub-departments when employee department is available
  useEffect(() => {
    if (!employee?.department) return;
    const fetchSubDepartments = async () => {
      try {
        const res = await getSubDepartmentsByDepartment(employee.department);
        if (res.status) {
          setSubDepartments(res.data || []);
        }
      } catch (error) {
        console.error("Error fetching sub-departments:", error);
      }
    };
    fetchSubDepartments();
  }, [employee?.department]);

  // Fetch cities when employee province is available
  useEffect(() => {
    if (!employee?.province) return;
    const fetchCities = async () => {
      try {
        const res = await getCitiesByState(employee.province);
        if (res.status) {
          setCities(res.data || []);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
    };
    fetchCities();
  }, [employee?.province]);

  if (loadingEmployee || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <EmployeeForm
      mode="edit"
      initialData={employee}
      departments={departments}
      subDepartments={subDepartments}
      employeeGrades={employeeGrades}
      designations={designations}
      maritalStatuses={maritalStatuses}
      employeeStatuses={employeeStatuses}
      branches={branches}
      states={states}
      cities={cities}
      equipments={equipments}
      workingHoursPolicies={workingHoursPolicies}
      leavesPolicies={leavesPolicies}
      qualifications={qualifications}
      institutes={institutes}
      loadingData={loadingData}
    />
  );
}

