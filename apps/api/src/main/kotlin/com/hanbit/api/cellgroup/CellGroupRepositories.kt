package com.hanbit.api.cellgroup

import org.springframework.data.jpa.repository.JpaRepository

interface CellGroupRepository : JpaRepository<CellGroup, String> {
    fun findAllByOrderByNameAsc(): List<CellGroup>
    fun findByActiveTrueOrderByNameAsc(): List<CellGroup>
}

interface CellGroupMemberRepository : JpaRepository<CellGroupMember, String> {
    fun findByCellGroupId(cellGroupId: String): List<CellGroupMember>
    fun findByCellGroupIdIn(cellGroupIds: Collection<String>): List<CellGroupMember>
    fun findByUserId(userId: Long): List<CellGroupMember>
    fun existsByCellGroupIdAndUserId(cellGroupId: String, userId: Long): Boolean
    fun deleteByCellGroupId(cellGroupId: String)
}

interface CellGroupMeetingRepository : JpaRepository<CellGroupMeeting, String> {
    fun findByCellGroupIdOrderByMeetAtDesc(cellGroupId: String): List<CellGroupMeeting>
    fun deleteByCellGroupId(cellGroupId: String)
}
