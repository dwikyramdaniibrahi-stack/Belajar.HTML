package pemdasbUts;

import java.util.Scanner;

class Matkul{
    String nama;
    int sks;
    String nilai;
}

public class PemdasUts {

    public static void main(String[] args) {

        Scanner input = new Scanner(System.in);

        System.out.print("Jumlah Matkul: ");
        int jumlah = input.nextInt();
        input.nextLine();

        int jumlahSks = 0;
        double totalMutu = 0;

        for (int i = 1; i <= jumlah; i++) {

            Matkul data = new Matkul();

            System.out.println("\nMatkul ke-" + i);

            System.out.print("Nama matkul: ");
            data.nama = input.nextLine();

            System.out.print("SKS: ");
            data.sks = input.nextInt();
            input.nextLine();

            System.out.print("Nilai huruf: ");
            data.nilai = input.nextLine();

            double bobot = 0;

            if (data.nilai.equals("A")) bobot = 4.0;
            else if (data.nilai.equals("A-")) bobot = 3.7;
            else if (data.nilai.equals("B+")) bobot = 3.3;
            else if (data.nilai.equals("B")) bobot = 3.0;
            else if (data.nilai.equals("C")) bobot = 2.0;
            else if (data.nilai.equals("D")) bobot = 1.0;
            else bobot = 0;

            totalMutu += bobot * data.sks;
            jumlahSks += data.sks;
        }

        double ips = totalMutu / jumlahSks;

        System.out.println("\nTotal SKS = " + jumlahSks);
        System.out.println("IPS Semester = " + ips);

        input.close();
    }
}