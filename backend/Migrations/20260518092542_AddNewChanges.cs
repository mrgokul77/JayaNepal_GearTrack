using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddNewChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AppointmentId",
                table: "ServiceReviews",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceReviews_AppointmentId",
                table: "ServiceReviews",
                column: "AppointmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceReviews_Appointments_AppointmentId",
                table: "ServiceReviews",
                column: "AppointmentId",
                principalTable: "Appointments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServiceReviews_Appointments_AppointmentId",
                table: "ServiceReviews");

            migrationBuilder.DropIndex(
                name: "IX_ServiceReviews_AppointmentId",
                table: "ServiceReviews");

            migrationBuilder.DropColumn(
                name: "AppointmentId",
                table: "ServiceReviews");
        }
    }
}
